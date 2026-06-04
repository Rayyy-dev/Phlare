import { prisma } from "@/server/db";
import { recordAudit } from "@/server/audit/log";
import { generateTrackingToken } from "@/server/tracking/token";
import { enqueueSends, enqueueScheduledLaunch } from "@/server/campaigns/dispatch";
import { campaignSchema, type CampaignInput } from "@/lib/validation";

export class CampaignError extends Error {}

export function listCampaigns() {
  return prisma.campaign.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      emailTemplate: { select: { name: true } },
      _count: { select: { targets: true } },
    },
  });
}

export function getCampaign(id: string) {
  return prisma.campaign.findFirst({
    where: { id, deletedAt: null },
    include: {
      emailTemplate: true,
      landingPage: true,
      sendingProfile: true,
      groups: { include: { group: true } },
    },
  });
}

/** Per-status target counts + interaction totals for the campaign detail view. */
export async function getCampaignStats(id: string) {
  const [targets, opened, clicked, submitted, reported, sent] = await Promise.all([
    prisma.campaignTarget.count({ where: { campaignId: id } }),
    prisma.campaignTarget.count({ where: { campaignId: id, firstOpenedAt: { not: null } } }),
    prisma.campaignTarget.count({ where: { campaignId: id, firstClickedAt: { not: null } } }),
    prisma.campaignTarget.count({ where: { campaignId: id, firstSubmittedAt: { not: null } } }),
    prisma.campaignTarget.count({ where: { campaignId: id, reportedAt: { not: null } } }),
    prisma.campaignTarget.count({ where: { campaignId: id, status: "SENT" } }),
  ]);
  return { targets, sent, opened, clicked, submitted, reported };
}

export async function createCampaign(
  input: CampaignInput,
  actorId: string
): Promise<string> {
  const data = campaignSchema.parse(input);

  const campaign = await prisma.campaign.create({
    data: {
      name: data.name,
      emailTemplateId: data.emailTemplateId,
      landingPageId: data.landingPageId,
      sendingProfileId: data.sendingProfileId,
      quizId: data.quizId ?? null,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      throttlePerMinute: data.throttlePerMinute,
      createdById: actorId,
      groups: { create: data.groupIds.map((groupId) => ({ groupId })) },
    },
  });

  await recordAudit({
    actorAdminId: actorId,
    action: "campaign.created",
    entityType: "Campaign",
    entityId: campaign.id,
    details: { name: campaign.name },
  });
  return campaign.id;
}

/**
 * Launch a DRAFT campaign. The authorisation gate is mandatory (Section 7.2):
 * without an explicit acknowledgement the launch is refused and recorded.
 * Expands the selected groups into one CampaignTarget per unique active
 * recipient, each with a fresh unguessable tracking token, then either starts
 * sending now or schedules a future automatic launch.
 */
export async function launchCampaign(
  id: string,
  actorId: string,
  acknowledged: boolean
): Promise<void> {
  const campaign = await prisma.campaign.findFirst({ where: { id, deletedAt: null } });
  if (!campaign) throw new CampaignError("Campaign not found.");
  if (campaign.status !== "DRAFT") throw new CampaignError("Only a draft campaign can be launched.");
  if (!acknowledged) throw new CampaignError("You must confirm you are authorised to test these recipients.");

  // Expand groups → unique active recipients → targets with tracking tokens.
  const groups = await prisma.campaignGroup.findMany({
    where: { campaignId: id },
    select: { groupId: true },
  });
  const members = await prisma.groupMember.findMany({
    where: { groupId: { in: groups.map((g) => g.groupId) }, recipient: { deletedAt: null } },
    select: { recipientId: true },
    distinct: ["recipientId"],
  });
  if (members.length === 0) throw new CampaignError("The selected groups have no active recipients.");

  await prisma.campaignTarget.createMany({
    data: members.map((m) => ({
      campaignId: id,
      recipientId: m.recipientId,
      trackingToken: generateTrackingToken(),
    })),
    skipDuplicates: true,
  });

  const now = new Date();
  const scheduled = campaign.scheduledAt != null && campaign.scheduledAt.getTime() > now.getTime();

  await prisma.campaign.update({
    where: { id },
    data: {
      authorizationAck: true,
      authorizedById: actorId,
      authorizedAt: now,
      status: scheduled ? "SCHEDULED" : "RUNNING",
      launchedAt: scheduled ? null : now,
    },
  });

  if (scheduled) {
    await enqueueScheduledLaunch(id, campaign.scheduledAt!);
  } else {
    await dispatchPending(id, campaign.throttlePerMinute);
  }

  await recordAudit({
    actorAdminId: actorId,
    action: "campaign.launched",
    entityType: "Campaign",
    entityId: id,
    details: { recipients: members.length, scheduledAt: campaign.scheduledAt },
  });
}

/** Move a campaign to RUNNING and enqueue all its still-pending sends. Used by
 *  the immediate launch path, the scheduled-launch processor, and resume. */
export async function startSending(campaignId: string): Promise<void> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return;
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "RUNNING", launchedAt: campaign.launchedAt ?? new Date() },
  });
  await dispatchPending(campaignId, campaign.throttlePerMinute);
}

async function dispatchPending(campaignId: string, throttlePerMinute: number) {
  const targets = await prisma.campaignTarget.findMany({
    where: { campaignId, status: "PENDING" },
    select: { id: true },
  });
  await enqueueSends(targets.map((t) => t.id), throttlePerMinute);
}

export async function pauseCampaign(id: string, actorId: string): Promise<void> {
  await prisma.campaign.updateMany({ where: { id, status: "RUNNING" }, data: { status: "PAUSED" } });
  await recordAudit({ actorAdminId: actorId, action: "campaign.paused", entityType: "Campaign", entityId: id });
}

export async function resumeCampaign(id: string, actorId: string): Promise<void> {
  const campaign = await prisma.campaign.findFirst({ where: { id, status: "PAUSED" } });
  if (!campaign) return;
  await startSending(id);
  await recordAudit({ actorAdminId: actorId, action: "campaign.resumed", entityType: "Campaign", entityId: id });
}

export async function stopCampaign(id: string, actorId: string): Promise<void> {
  await prisma.campaign.updateMany({
    where: { id, status: { in: ["RUNNING", "PAUSED", "SCHEDULED"] } },
    data: { status: "STOPPED" },
  });
  await recordAudit({ actorAdminId: actorId, action: "campaign.stopped", entityType: "Campaign", entityId: id });
}

export async function softDeleteCampaign(id: string, actorId: string): Promise<void> {
  await prisma.campaign.update({ where: { id }, data: { deletedAt: new Date() } });
  await recordAudit({ actorAdminId: actorId, action: "campaign.deleted", entityType: "Campaign", entityId: id });
}
