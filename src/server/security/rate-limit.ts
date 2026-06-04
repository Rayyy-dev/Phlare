/**
 * Lightweight in-memory fixed-window rate limiter for the public tracking
 * routes (Section 7.6 hardening). Self-hosted Phlare runs as a single web
 * process, so a per-process map is sufficient; a Redis-backed limiter would be
 * the multi-node upgrade. Coarse by design — the per-IP window is generous so a
 * whole office behind one NAT egress IP is not throttled during a campaign.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 300;

interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

export function allowRequest(key: string, limit = MAX_PER_WINDOW, windowMs = WINDOW_MS): boolean {
  const now = Date.now();

  // Opportunistic sweep so the map cannot grow without bound.
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
  }

  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}

/** Best-effort client IP from proxy headers (coarse, used only for rate-limit keys). */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
