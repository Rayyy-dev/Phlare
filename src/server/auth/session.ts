import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/server/db";
import type { Admin } from "@prisma/client";

/**
 * Server-side session management.
 *
 * Design (justified in DECISIONS.md): we chose stateful server sessions over
 * JWTs. The cookie carries a 32-byte random token; the database stores only its
 * SHA-256 hash. Therefore a database compromise cannot reconstruct a live
 * session cookie, and sessions can be revoked instantly (logout, lockout).
 */

export const SESSION_COOKIE = "phlare_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const SESSION_REFRESH_MS = 1000 * 60 * 60 * 24; // slide expiry if <1 day used

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createSession(
  adminId: string,
  meta: { ip?: string; userAgent?: string } = {}
): Promise<string> {
  const token = generateSessionToken();
  await prisma.session.create({
    data: {
      id: hashToken(token),
      adminId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      ip: meta.ip,
      userAgent: meta.userAgent?.slice(0, 255),
    },
  });
  return token;
}

export interface SessionValidation {
  admin: Admin;
  sessionId: string;
}

/** Validate a raw token; returns the admin or null. Slides expiry when stale. */
export async function validateSessionToken(
  token: string
): Promise<SessionValidation | null> {
  const sessionId = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { admin: true },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
    return null;
  }

  if (!session.admin.isActive) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
    return null;
  }

  // Sliding window: extend if the session is close to expiry.
  if (session.expiresAt.getTime() - Date.now() < SESSION_TTL_MS - SESSION_REFRESH_MS) {
    await prisma.session.update({
      where: { id: sessionId },
      data: { expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
    });
  }

  return { admin: session.admin, sessionId };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
}

export async function invalidateAllSessions(adminId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { adminId } });
}

// ── Cookie helpers (Next.js App Router) ──────────────────────────────────────

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Resolve the current admin from the request cookie, or null. */
export async function getCurrentSession(): Promise<SessionValidation | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateSessionToken(token);
}

export async function getCurrentAdmin(): Promise<Admin | null> {
  const session = await getCurrentSession();
  return session?.admin ?? null;
}
