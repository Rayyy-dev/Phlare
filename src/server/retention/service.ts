import { prisma } from "@/server/db";
import { getSettings } from "@/server/settings/settings";
import { recordAudit } from "@/server/audit/log";

/**
 * Data-retention cleanup (GDPR storage-limitation, Section 7.5).
 *
 * Deletes raw tracking events older than `Settings.retentionDays`. The
 * denormalised first-event markers and per-recipient counts on
 * `CampaignTarget` are kept, so historical *aggregates* survive while the
 * detailed, timestamped event log is pruned. A retention of 0 (or less) means
 * "keep indefinitely" and is treated as a no-op.
 *
 * Runs from the worker (daily schedule + on demand). The cleanup is recorded in
 * the audit log for accountability.
 */
export async function runRetentionCleanup(): Promise<{ deletedEvents: number; cutoff: Date | null }> {
  const settings = await getSettings();
  const days = settings.retentionDays;
  if (!days || days <= 0) return { deletedEvents: 0, cutoff: null };

  const cutoff = new Date(Date.now() - days * 86_400_000);
  const { count } = await prisma.event.deleteMany({ where: { occurredAt: { lt: cutoff } } });

  if (count > 0) {
    await recordAudit({
      action: "retention.cleanup",
      details: { retentionDays: days, cutoff: cutoff.toISOString(), deletedEvents: count },
    });
  }
  return { deletedEvents: count, cutoff };
}
