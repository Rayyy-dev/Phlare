import { Worker } from "bullmq";
import { connection, riskQueue, QUEUE_NAMES } from "./queues";
import { processSend, processScheduledLaunch } from "@/server/campaigns/send-runner";
import { refreshAllRiskScores } from "@/server/risk/service";

/**
 * Background worker entrypoint. Runs as a separate process/container from the
 * web app (justified in DECISIONS.md): sending and scheduled launches are
 * long-running and must not block HTTP request handlers.
 */

console.log("[worker] starting Phlare background worker…");

const sendWorker = new Worker(
  QUEUE_NAMES.send,
  async (job) => {
    await processSend(job.data.targetId as string);
  },
  { connection, concurrency: 5 }
);

const scheduleWorker = new Worker(
  QUEUE_NAMES.schedule,
  async (job) => {
    await processScheduledLaunch(job.data.campaignId as string);
  },
  { connection }
);

const riskWorker = new Worker(
  QUEUE_NAMES.risk,
  async () => {
    const n = await refreshAllRiskScores();
    console.log(`[worker:risk] recomputed risk scores for ${n} recipients`);
  },
  { connection }
);

// Data-retention cleanup is implemented in Phase 7; the queue is wired now.
const retentionWorker = new Worker(
  QUEUE_NAMES.retention,
  async (job) => {
    console.log(`[worker:retention] (placeholder) job ${job.id}`, job.data);
  },
  { connection }
);

for (const w of [sendWorker, scheduleWorker, riskWorker, retentionWorker]) {
  w.on("ready", () => console.log(`[worker] queue "${w.name}" ready`));
  w.on("failed", (job, err) => console.error(`[worker] job ${job?.id} failed:`, err));
}

// Periodic safety-net recompute (event-driven debounced refresh is the primary path).
riskQueue
  .upsertJobScheduler("risk-periodic", { every: 120_000 }, { name: "refresh" })
  .catch((err) => console.error("[worker] failed to schedule risk refresh:", err));

async function shutdown() {
  console.log("[worker] shutting down…");
  await Promise.all([sendWorker.close(), scheduleWorker.close(), riskWorker.close(), retentionWorker.close()]);
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
