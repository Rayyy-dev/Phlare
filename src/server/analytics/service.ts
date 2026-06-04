import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";

export interface Metrics {
  delivered: number;
  opened: number;
  clicked: number;
  submitted: number;
  reported: number;
  openRate: number;
  clickRate: number;
  submissionRate: number;
  reportRate: number;
  /** Phish-prone %: clicked and/or submitted ÷ delivered. */
  phishProne: number;
}

function rate(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 1000) / 10 : 0;
}

/** Compute the standard metric set over any CampaignTarget filter. */
async function metricsFor(where: Prisma.CampaignTargetWhereInput): Promise<Metrics> {
  const [delivered, opened, clicked, submitted, reported, phishProne] = await Promise.all([
    prisma.campaignTarget.count({ where: { ...where, status: "SENT" } }),
    prisma.campaignTarget.count({ where: { ...where, firstOpenedAt: { not: null } } }),
    prisma.campaignTarget.count({ where: { ...where, firstClickedAt: { not: null } } }),
    prisma.campaignTarget.count({ where: { ...where, firstSubmittedAt: { not: null } } }),
    prisma.campaignTarget.count({ where: { ...where, reportedAt: { not: null } } }),
    prisma.campaignTarget.count({
      where: { ...where, OR: [{ firstClickedAt: { not: null } }, { firstSubmittedAt: { not: null } }] },
    }),
  ]);
  return {
    delivered, opened, clicked, submitted, reported,
    openRate: rate(opened, delivered),
    clickRate: rate(clicked, delivered),
    submissionRate: rate(submitted, delivered),
    reportRate: rate(reported, delivered),
    phishProne: rate(phishProne, delivered),
  };
}

export async function getOrgMetrics() {
  const [metrics, campaigns] = await Promise.all([
    metricsFor({}),
    prisma.campaign.count({ where: { deletedAt: null } }),
  ]);
  return { metrics, campaigns };
}

export function getCampaignMetrics(campaignId: string) {
  return metricsFor({ campaignId });
}

export interface TimeSeriesPoint {
  minute: number;
  opened: number;
  clicked: number;
  submitted: number;
}

/** Cumulative opened/clicked/submitted by minute since the campaign launched. */
export async function getCampaignTimeSeries(campaignId: string): Promise<TimeSeriesPoint[]> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { launchedAt: true } });
  if (!campaign?.launchedAt) return [];
  const launch = campaign.launchedAt.getTime();

  const events = await prisma.event.findMany({
    where: { campaignTarget: { campaignId }, type: { in: ["OPENED", "CLICKED", "SUBMITTED"] } },
    select: { type: true, occurredAt: true },
    orderBy: { occurredAt: "asc" },
  });

  const points: TimeSeriesPoint[] = [];
  let opened = 0, clicked = 0, submitted = 0;
  let lastMinute = -1;
  for (const e of events) {
    const minute = Math.max(0, Math.floor((e.occurredAt.getTime() - launch) / 60000));
    if (e.type === "OPENED") opened++;
    else if (e.type === "CLICKED") clicked++;
    else if (e.type === "SUBMITTED") submitted++;
    if (minute === lastMinute && points.length) {
      points[points.length - 1] = { minute, opened, clicked, submitted };
    } else {
      points.push({ minute, opened, clicked, submitted });
      lastMinute = minute;
    }
  }
  return points;
}

export interface DepartmentRow {
  department: string;
  delivered: number;
  clicked: number;
  submitted: number;
  reported: number;
  phishProne: number;
}

export async function getDepartmentBreakdown(): Promise<DepartmentRow[]> {
  const targets = await prisma.campaignTarget.findMany({
    where: { status: "SENT" },
    select: {
      firstClickedAt: true, firstSubmittedAt: true, reportedAt: true,
      recipient: { select: { department: true } },
    },
  });
  const map = new Map<string, { delivered: number; clicked: number; submitted: number; reported: number; phishProne: number }>();
  for (const t of targets) {
    const dept = t.recipient.department ?? "Unassigned";
    const row = map.get(dept) ?? { delivered: 0, clicked: 0, submitted: 0, reported: 0, phishProne: 0 };
    row.delivered++;
    if (t.firstClickedAt) row.clicked++;
    if (t.firstSubmittedAt) row.submitted++;
    if (t.reportedAt) row.reported++;
    if (t.firstClickedAt || t.firstSubmittedAt) row.phishProne++; // counted once per target
    map.set(dept, row);
  }
  return [...map.entries()]
    .map(([department, r]) => ({
      department,
      delivered: r.delivered,
      clicked: r.clicked,
      submitted: r.submitted,
      reported: r.reported,
      phishProne: rate(r.phishProne, r.delivered),
    }))
    .sort((a, b) => b.phishProne - a.phishProne);
}

export interface RepeatClicker {
  id: string;
  name: string;
  email: string;
  department: string | null;
  campaigns: number;
  riskScore: number;
}

/** Recipients who clicked and/or submitted across two or more campaigns. */
export async function getRepeatClickers(): Promise<RepeatClicker[]> {
  const rows = await prisma.campaignTarget.findMany({
    where: { OR: [{ firstClickedAt: { not: null } }, { firstSubmittedAt: { not: null } }] },
    select: { recipientId: true, campaignId: true },
  });
  const byRecipient = new Map<string, Set<string>>();
  for (const r of rows) {
    const set = byRecipient.get(r.recipientId) ?? new Set<string>();
    set.add(r.campaignId);
    byRecipient.set(r.recipientId, set);
  }
  const repeatIds = [...byRecipient.entries()].filter(([, set]) => set.size >= 2).map(([id]) => id);
  if (repeatIds.length === 0) return [];

  const recipients = await prisma.recipient.findMany({
    where: { id: { in: repeatIds }, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, email: true, department: true, riskScore: true },
  });
  return recipients
    .map((r) => ({
      id: r.id, name: `${r.firstName} ${r.lastName}`, email: r.email,
      department: r.department, campaigns: byRecipient.get(r.id)!.size, riskScore: r.riskScore,
    }))
    .sort((a, b) => b.campaigns - a.campaigns || b.riskScore - a.riskScore);
}

export interface CampaignResultRow {
  firstName: string;
  lastName: string;
  email: string;
  department: string | null;
  status: string;
  opened: boolean;
  clicked: boolean;
  submitted: boolean;
  reported: boolean;
  quizScore: string;
}

/** Per-recipient results for a campaign (used by the table and CSV export). */
export async function getCampaignResults(campaignId: string): Promise<CampaignResultRow[]> {
  const targets = await prisma.campaignTarget.findMany({
    where: { campaignId },
    select: {
      status: true, firstOpenedAt: true, firstClickedAt: true, firstSubmittedAt: true, reportedAt: true,
      recipient: { select: { firstName: true, lastName: true, email: true, department: true } },
      quizResults: { select: { score: true, total: true }, take: 1 },
    },
    orderBy: { recipient: { lastName: "asc" } },
  });
  return targets.map((t) => ({
    firstName: t.recipient.firstName,
    lastName: t.recipient.lastName,
    email: t.recipient.email,
    department: t.recipient.department,
    status: t.status,
    opened: t.firstOpenedAt != null,
    clicked: t.firstClickedAt != null,
    submitted: t.firstSubmittedAt != null,
    reported: t.reportedAt != null,
    quizScore: t.quizResults[0] ? `${t.quizResults[0].score}/${t.quizResults[0].total}` : "",
  }));
}
