import { prisma } from "@/server/db";
import type { EventType, Prisma } from "@prisma/client";

/**
 * Recording of recipient-facing tracking events.
 *
 * Each "first" interaction (open/click/submit/report) is recorded once: we flip
 * the denormalised `first…At` marker with a conditional `updateMany` (atomic, so
 * a double-loaded pixel or a re-click cannot double-count) and only write the
 * Event row when that flip actually happened. Unknown tokens resolve to no-ops —
 * callers must never reveal whether a token was valid (no enumeration hints).
 */

type FirstField =
  | "firstOpenedAt"
  | "firstClickedAt"
  | "firstSubmittedAt"
  | "reportedAt";

async function recordFirst(
  token: string,
  field: FirstField,
  type: EventType,
  metadata?: Prisma.InputJsonValue,
  meta?: { userAgent?: string | null }
): Promise<void> {
  const flipped = await prisma.campaignTarget.updateMany({
    where: { trackingToken: token, [field]: null },
    data: { [field]: new Date() },
  });
  if (flipped.count !== 1) return; // unknown token, or already recorded

  const target = await prisma.campaignTarget.findUnique({
    where: { trackingToken: token },
    select: { id: true },
  });
  if (!target) return;

  await prisma.event.create({
    data: {
      campaignTargetId: target.id,
      type,
      userAgent: meta?.userAgent?.slice(0, 255) ?? null,
      metadata,
    },
  });
}

export function recordOpen(token: string, userAgent?: string | null) {
  return recordFirst(token, "firstOpenedAt", "OPENED", undefined, { userAgent });
}

export function recordClick(token: string, userAgent?: string | null) {
  return recordFirst(token, "firstClickedAt", "CLICKED", undefined, { userAgent });
}

/**
 * Record a form submission. `fieldNames` is the list of field NAMES that were
 * present — NEVER the values the recipient typed. The submit route reads only
 * the names and discards values before calling this (Section 7.1).
 */
export function recordSubmit(
  token: string,
  fieldNames: string[],
  userAgent?: string | null
) {
  return recordFirst(token, "firstSubmittedAt", "SUBMITTED", { fields: fieldNames }, { userAgent });
}

export function recordReport(token: string, userAgent?: string | null) {
  return recordFirst(token, "reportedAt", "REPORTED", undefined, { userAgent });
}

/**
 * Record an event at most once per target (used for LEARN_VIEWED, which has no
 * dedicated `first…At` column). Safe on unknown tokens (no-op). There is a tiny
 * race window on concurrent first-views; a duplicate learn view is harmless.
 */
export async function recordEventOnce(
  token: string,
  type: EventType,
  userAgent?: string | null
): Promise<void> {
  const target = await prisma.campaignTarget.findUnique({
    where: { trackingToken: token },
    select: { id: true },
  });
  if (!target) return;
  const existing = await prisma.event.findFirst({
    where: { campaignTargetId: target.id, type },
    select: { id: true },
  });
  if (existing) return;
  await prisma.event.create({
    data: { campaignTargetId: target.id, type, userAgent: userAgent?.slice(0, 255) ?? null },
  });
}

/** Load the target + the content needed to render a click/landing/learn page. */
export function getTargetForRender(token: string) {
  return prisma.campaignTarget.findUnique({
    where: { trackingToken: token },
    include: {
      campaign: { include: { landingPage: true, emailTemplate: true } },
      recipient: true,
    },
  });
}
