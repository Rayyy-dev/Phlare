import nodemailer, { type Transporter } from "nodemailer";
import type { SendingProfile, SmtpSecurity } from "@prisma/client";
import { decryptSecret } from "@/server/crypto/encryption";

/**
 * Builds a Nodemailer transport from a sending profile. The SMTP password is
 * decrypted from `passwordCiphertext` only here, in memory, at send time — it is
 * never stored or returned in plaintext elsewhere.
 *
 * `security` maps to TLS behaviour:
 *   SSL      → implicit TLS (e.g. port 465)
 *   STARTTLS → upgrade an unencrypted connection (e.g. port 587)
 *   NONE     → no TLS (used for the local Mailpit catcher in dev)
 */
function secureFlags(security: SmtpSecurity) {
  switch (security) {
    case "SSL":
      return { secure: true };
    case "STARTTLS":
      return { secure: false, requireTLS: true };
    case "NONE":
    default:
      return { secure: false, ignoreTLS: true };
  }
}

export function buildTransport(profile: SendingProfile): Transporter {
  const password = profile.passwordCiphertext
    ? decryptSecret(profile.passwordCiphertext)
    : undefined;

  return nodemailer.createTransport({
    host: profile.host,
    port: profile.port,
    ...secureFlags(profile.security),
    auth: profile.username
      ? { user: profile.username, pass: password ?? "" }
      : undefined,
  });
}

export interface SendResult {
  ok: boolean;
  error?: string;
}

export async function sendMail(
  profile: SendingProfile,
  message: { to: string; subject: string; html: string; text?: string }
): Promise<SendResult> {
  try {
    const transport = buildTransport(profile);
    await transport.sendMail({
      from: { name: profile.fromName, address: profile.fromEmail },
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Send failed." };
  }
}
