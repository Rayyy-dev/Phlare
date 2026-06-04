import { prisma } from "@/server/db";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { recordAudit } from "@/server/audit/log";
import type { Admin } from "@prisma/client";

/**
 * Admin account lifecycle: first-run creation and authentication with
 * brute-force protection (rate-limited login + lockout, Section 5.1).
 */

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 1000 * 60 * 15;

// A real argon2id hash verified against when the email is unknown, so a failed
// login takes the same time whether or not the account exists (anti-enumeration).
const DUMMY_HASH =
  "$argon2id$v=19$m=65536,t=3,p=1$8Hcc4eHLzZV3UyF4f4/3AQ$wacK+FTn6k4RLZne/a0puOkyQG3C3lL+9F5GkLurK2Q";

export class SetupAlreadyCompleteError extends Error {}

/** Create the initial admin. Refuses if any admin already exists (first-run only). */
export async function setupFirstAdmin(input: {
  name: string;
  email: string;
  password: string;
  orgName: string;
  baseUrl: string;
}): Promise<Admin> {
  const existing = await prisma.admin.count();
  if (existing > 0) {
    throw new SetupAlreadyCompleteError("Setup has already been completed.");
  }

  const passwordHash = await hashPassword(input.password);

  // Create the admin and seed the singleton settings row atomically.
  const admin = await prisma.$transaction(async (tx) => {
    const created = await tx.admin.create({
      data: { name: input.name, email: input.email, passwordHash },
    });
    await tx.settings.upsert({
      where: { id: "singleton" },
      update: {
        orgName: input.orgName,
        baseUrl: input.baseUrl,
        setupCompleted: true,
      },
      create: {
        id: "singleton",
        orgName: input.orgName,
        baseUrl: input.baseUrl,
        setupCompleted: true,
      },
    });
    return created;
  });

  await recordAudit({
    actorAdminId: admin.id,
    action: "admin.setup_completed",
    entityType: "Admin",
    entityId: admin.id,
    details: { email: admin.email },
  });

  return admin;
}

export type AuthResult =
  | { ok: true; admin: Admin }
  | { ok: false; reason: "invalid" | "locked" };

/**
 * Verify credentials with lockout. To avoid leaking which emails exist, an
 * unknown email and a wrong password return the same generic "invalid" result.
 */
export async function authenticateAdmin(
  email: string,
  password: string
): Promise<AuthResult> {
  const admin = await prisma.admin.findUnique({ where: { email } });

  if (!admin || !admin.isActive) {
    await verifyPassword(DUMMY_HASH, password);
    return { ok: false, reason: "invalid" };
  }

  if (admin.lockedUntil && admin.lockedUntil.getTime() > Date.now()) {
    return { ok: false, reason: "locked" };
  }

  const valid = await verifyPassword(admin.passwordHash, password);

  if (!valid) {
    const attempts = admin.failedLoginAttempts + 1;
    const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        failedLoginAttempts: shouldLock ? 0 : attempts,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_MS) : null,
      },
    });
    if (shouldLock) {
      await recordAudit({
        actorAdminId: admin.id,
        action: "admin.locked_out",
        entityType: "Admin",
        entityId: admin.id,
      });
      return { ok: false, reason: "locked" };
    }
    return { ok: false, reason: "invalid" };
  }

  // Success: reset counters and stamp last login.
  await prisma.admin.update({
    where: { id: admin.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  return { ok: true, admin };
}
