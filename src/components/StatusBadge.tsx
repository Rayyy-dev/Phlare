import type { CampaignStatus } from "@prisma/client";

const MAP: Record<CampaignStatus, { label: string; badge: string; dot: string }> = {
  DRAFT: { label: "Draft", badge: "badge-neutral", dot: "bg-ink-400" },
  SCHEDULED: { label: "Scheduled", badge: "badge-brand", dot: "bg-brand-500" },
  RUNNING: { label: "Running", badge: "badge-green", dot: "bg-emerald-500" },
  PAUSED: { label: "Paused", badge: "badge-amber", dot: "bg-amber-500" },
  COMPLETED: { label: "Completed", badge: "badge-neutral", dot: "bg-ink-400" },
  STOPPED: { label: "Stopped", badge: "badge-red", dot: "bg-red-500" },
};

/** Consistent campaign status pill used across the dashboard and lists. */
export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const s = MAP[status] ?? MAP.DRAFT;
  return (
    <span className={`badge ${s.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  );
}
