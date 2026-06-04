import { Queue, type ConnectionOptions } from "bullmq";
import { env } from "@/lib/env";

/**
 * BullMQ connection + queue definitions, shared by the web app (which enqueues
 * jobs) and the worker (which processes them).
 *
 * We pass plain connection OPTIONS (not a pre-built ioredis instance) so BullMQ
 * manages its own connections with its bundled ioredis — this avoids type/
 * version clashes between BullMQ's ioredis and a top-level one. `maxRetries
 * PerRequest: null` is required by BullMQ for its blocking commands.
 */
function parseRedis(url: string): ConnectionOptions {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 6379,
    username: u.username || undefined,
    password: u.password || undefined,
    maxRetriesPerRequest: null,
  };
}

export const connection: ConnectionOptions = parseRedis(env.redisUrl);

/** Queue names — kept as constants so producers and consumers cannot drift. */
export const QUEUE_NAMES = {
  /** Sends a single campaign email (one job per recipient, rate-limited). */
  send: "campaign-send",
  /** Launches/expands a scheduled campaign into per-recipient send jobs. */
  schedule: "campaign-schedule",
  /** Recompute and cache recipient risk scores. */
  risk: "risk-refresh",
  /** Periodic data-retention cleanup of old events (GDPR-aware). */
  retention: "retention-cleanup",
} as const;

export const sendQueue = new Queue(QUEUE_NAMES.send, { connection });
export const scheduleQueue = new Queue(QUEUE_NAMES.schedule, { connection });
export const riskQueue = new Queue(QUEUE_NAMES.risk, { connection });
export const retentionQueue = new Queue(QUEUE_NAMES.retention, { connection });

/**
 * Debounced risk recompute: a stable jobId means a burst of tracking events
 * coalesces into a single refresh ~`delayMs` later instead of recomputing on
 * every click.
 */
export async function enqueueRiskRefresh(delayMs = 8000): Promise<void> {
  await riskQueue.add(
    "refresh",
    {},
    { jobId: "risk-refresh", delay: delayMs, removeOnComplete: true, removeOnFail: 100 }
  );
}
