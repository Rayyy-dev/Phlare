import { prisma } from "@/server/db";
import { computeRiskScore, outcomeOf, type Participation } from "@/server/risk/score";

const DAY_MS = 86_400_000;

/** Build a recipient's participations from their sent campaign targets. */
function participationsOf(
  targets: {
    firstSubmittedAt: Date | null;
    firstClickedAt: Date | null;
    firstOpenedAt: Date | null;
    reportedAt: Date | null;
    sentAt: Date | null;
    quizResults: { id: string }[];
  }[],
  now: number
): Participation[] {
  return targets
    .filter((t) => t.sentAt != null)
    .map((t) => ({
      outcome: outcomeOf(t),
      reported: t.reportedAt != null,
      quizCompleted: t.quizResults.length > 0,
      ageDays: (now - t.sentAt!.getTime()) / DAY_MS,
    }));
}

const targetSelect = {
  firstSubmittedAt: true,
  firstClickedAt: true,
  firstOpenedAt: true,
  reportedAt: true,
  sentAt: true,
  quizResults: { select: { id: true } },
} as const;

/**
 * Recompute every active recipient's risk score and cache it on
 * `Recipient.riskScore`. Invoked by the worker (periodically and after campaign
 * activity), and on demand from the analytics page.
 */
export async function refreshAllRiskScores(): Promise<number> {
  const recipients = await prisma.recipient.findMany({
    where: { deletedAt: null },
    select: { id: true, campaignTargets: { where: { sentAt: { not: null } }, select: targetSelect } },
  });
  const now = Date.now();
  const updates = recipients.map((r) => ({
    id: r.id,
    riskScore: computeRiskScore(participationsOf(r.campaignTargets, now)).score,
  }));

  // Bound write concurrency so a few thousand recipients don't exhaust the
  // connection pool (NFR: handle thousands of recipients).
  const CHUNK = 25;
  for (let i = 0; i < updates.length; i += CHUNK) {
    await Promise.all(
      updates.slice(i, i + CHUNK).map((u) =>
        prisma.recipient.update({ where: { id: u.id }, data: { riskScore: u.riskScore } })
      )
    );
  }
  return recipients.length;
}

/** Highest-risk recipients (reads the cached score). */
export function listHighRisk(limit = 20) {
  return prisma.recipient.findMany({
    where: { deletedAt: null },
    orderBy: { riskScore: "desc" },
    take: limit,
    select: { id: true, firstName: true, lastName: true, email: true, department: true, riskScore: true },
  });
}

/** Per-recipient breakdown for the explainable detail view. */
export async function getRecipientRiskBreakdown(id: string) {
  const recipient = await prisma.recipient.findUnique({
    where: { id },
    select: { id: true, firstName: true, lastName: true, riskScore: true, campaignTargets: { where: { sentAt: { not: null } }, select: targetSelect } },
  });
  if (!recipient) return null;
  const parts = participationsOf(recipient.campaignTargets, Date.now());
  return { recipient, parts, result: computeRiskScore(parts) };
}
