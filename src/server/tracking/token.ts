import { randomBytes } from "node:crypto";

/**
 * Per-recipient tracking token: 32 cryptographically random bytes, base64url
 * encoded. Unguessable and non-sequential, so a recipient cannot enumerate or
 * forge another recipient's tracking links (IDOR defence — Section 7.6).
 */
export function generateTrackingToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Build the public tracking URLs for a token from the configured base URL. */
export function trackingLinks(baseUrl: string, token: string) {
  const base = baseUrl.replace(/\/$/, "");
  return {
    open: `${base}/t/o/${token}`,
    click: `${base}/t/c/${token}`,
    report: `${base}/t/report/${token}`,
    learn: `${base}/t/learn/${token}`,
  };
}
