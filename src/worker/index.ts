import { Worker } from "bullmq";
import { connection, QUEUE_NAMES } from "./queues";

/**
 * Background worker entrypoint. Runs as a separate process/container from the
 * web app (justified in DECISIONS.md): sending and scheduled launches are
 * long-running and must not block HTTP request handlers.
 *
 * Phase 1 stands up the worker process and queue wiring. The actual send,
 * schedule, and retention processors are implemented in Phase 4 / 7; for now
 * each queue has a placeholder consumer so the infrastructure is verifiable.
 */

console.log("[worker] starting Phlare background worker…");

const sendWorker = new Worker(
  QUEUE_NAMES.send,
  async (job) => {
    console.log(`[worker:send] (placeholder) job ${job.id}`, job.data);
  },
  { connection }
);

const scheduleWorker = new Worker(
  QUEUE_NAMES.schedule,
  async (job) => {
    console.log(`[worker:schedule] (placeholder) job ${job.id}`, job.data);
  },
  { connection }
);

const retentionWorker = new Worker(
  QUEUE_NAMES.retention,
  async (job) => {
    console.log(`[worker:retention] (placeholder) job ${job.id}`, job.data);
  },
  { connection }
);

for (const w of [sendWorker, scheduleWorker, retentionWorker]) {
  w.on("ready", () => console.log(`[worker] queue "${w.name}" ready`));
  w.on("failed", (job, err) =>
    console.error(`[worker] job ${job?.id} failed:`, err)
  );
}

// Graceful shutdown so in-flight jobs are not lost on container stop.
async function shutdown() {
  console.log("[worker] shutting down…");
  await Promise.all([
    sendWorker.close(),
    scheduleWorker.close(),
    retentionWorker.close(),
  ]);
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
