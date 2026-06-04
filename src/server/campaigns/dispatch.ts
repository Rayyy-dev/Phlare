import { sendQueue, scheduleQueue } from "@/worker/queues";

/**
 * Enqueues campaign work onto BullMQ. Kept separate from the campaign service so
 * the queueing mechanism can be reasoned about (and mocked) in isolation.
 *
 * Throttling: rather than a single global worker rate-limiter (which could not
 * honour a *per-campaign* rate), we stagger each recipient's send with a delay
 * derived from `throttlePerMinute`. Job N is delayed N × (60000 / rate) ms, so a
 * 60/min campaign sends one message per second. Stable `jobId`s make enqueueing
 * idempotent, so resuming a paused campaign cannot double-send.
 */
export async function enqueueSends(
  targetIds: string[],
  throttlePerMinute: number
): Promise<void> {
  const intervalMs = Math.ceil(60000 / throttlePerMinute);
  await sendQueue.addBulk(
    targetIds.map((targetId, i) => ({
      name: "send",
      data: { targetId },
      opts: {
        jobId: `send-${targetId}`,
        delay: i * intervalMs,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    }))
  );
}

/** Schedule a future automatic launch (the schedule processor starts sending). */
export async function enqueueScheduledLaunch(
  campaignId: string,
  runAt: Date
): Promise<void> {
  const delay = Math.max(0, runAt.getTime() - Date.now());
  await scheduleQueue.add(
    "launch",
    { campaignId },
    { jobId: `schedule-${campaignId}`, delay, removeOnComplete: true, removeOnFail: 1000 }
  );
}
