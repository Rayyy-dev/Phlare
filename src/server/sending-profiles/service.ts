import { prisma } from "@/server/db";
import { recordAudit } from "@/server/audit/log";
import { encryptSecret } from "@/server/crypto/encryption";
import { sendMail } from "@/server/mail/mailer";
import { sendingProfileSchema, type SendingProfileInput } from "@/lib/validation";
import type { SendingProfile } from "@prisma/client";

/**
 * Client-safe view of a sending profile. The encrypted password is NEVER
 * included; the UI only learns whether a password is set (`hasPassword`) so it
 * can offer a "change password" control.
 */
export interface SendingProfileView {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string | null;
  security: "NONE" | "STARTTLS" | "SSL";
  fromName: string;
  fromEmail: string;
  hasPassword: boolean;
  lastTestedAt: Date | null;
  lastTestOk: boolean | null;
}

// Build the client-facing view explicitly, so only these fields are ever
// returned — the ciphertext and internal timestamps never leave the server.
function toView(p: SendingProfile): SendingProfileView {
  return {
    id: p.id,
    name: p.name,
    host: p.host,
    port: p.port,
    username: p.username,
    security: p.security,
    fromName: p.fromName,
    fromEmail: p.fromEmail,
    hasPassword: p.passwordCiphertext !== null,
    lastTestedAt: p.lastTestedAt,
    lastTestOk: p.lastTestOk,
  };
}

export async function listProfiles(): Promise<SendingProfileView[]> {
  const rows = await prisma.sendingProfile.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });
  return rows.map(toView);
}

export async function getProfileView(id: string): Promise<SendingProfileView | null> {
  const row = await prisma.sendingProfile.findFirst({ where: { id, deletedAt: null } });
  return row ? toView(row) : null;
}

function coreData(data: SendingProfileInput) {
  return {
    name: data.name,
    host: data.host,
    port: data.port,
    username: data.username ?? null,
    security: data.security,
    fromName: data.fromName,
    fromEmail: data.fromEmail,
  };
}

export async function createProfile(
  input: SendingProfileInput,
  actorId: string
): Promise<string> {
  const data = sendingProfileSchema.parse(input);
  const profile = await prisma.sendingProfile.create({
    data: {
      ...coreData(data),
      // Encrypt the password at rest; store nothing if none was provided.
      passwordCiphertext: data.password ? encryptSecret(data.password) : null,
    },
  });
  await recordAudit({
    actorAdminId: actorId,
    action: "sending_profile.created",
    entityType: "SendingProfile",
    entityId: profile.id,
    details: { name: profile.name },
  });
  return profile.id;
}

export async function updateProfile(
  id: string,
  input: SendingProfileInput,
  actorId: string
): Promise<void> {
  const data = sendingProfileSchema.parse(input);
  await prisma.sendingProfile.update({
    where: { id },
    data: {
      ...coreData(data),
      // Only re-encrypt when a new password was actually entered; otherwise the
      // existing ciphertext is left untouched.
      ...(data.password ? { passwordCiphertext: encryptSecret(data.password) } : {}),
    },
  });
  await recordAudit({
    actorAdminId: actorId,
    action: "sending_profile.updated",
    entityType: "SendingProfile",
    entityId: id,
  });
}

export async function softDeleteProfile(id: string, actorId: string): Promise<void> {
  await prisma.sendingProfile.update({ where: { id }, data: { deletedAt: new Date() } });
  await recordAudit({
    actorAdminId: actorId,
    action: "sending_profile.deleted",
    entityType: "SendingProfile",
    entityId: id,
  });
}

/** Send a test message through the profile and record the outcome. */
export async function sendTestEmail(
  id: string,
  to: string,
  actorId: string
): Promise<{ ok: boolean; error?: string }> {
  const profile = await prisma.sendingProfile.findFirst({ where: { id, deletedAt: null } });
  if (!profile) return { ok: false, error: "Profile not found." };

  const result = await sendMail(profile, {
    to,
    subject: "Phlare — sending profile test",
    html: `<p>This is a test message from the Phlare sending profile <strong>${profile.name}</strong>.</p>
           <p>If you can read this, the SMTP configuration works.</p>`,
    text: `This is a test message from the Phlare sending profile "${profile.name}". If you can read this, the SMTP configuration works.`,
  });

  await prisma.sendingProfile.update({
    where: { id },
    data: { lastTestedAt: new Date(), lastTestOk: result.ok },
  });
  await recordAudit({
    actorAdminId: actorId,
    action: "sending_profile.tested",
    entityType: "SendingProfile",
    entityId: id,
    details: { to, ok: result.ok },
  });

  return result;
}
