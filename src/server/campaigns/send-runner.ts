import { prisma } from "@/server/db";
import { getSettings } from "@/server/settings/settings";
import { trackingLinks } from "@/server/tracking/token";
import { renderPersonalisation } from "@/lib/personalization";
import { sendMail } from "@/server/mail/mailer";
import { startSending } from "@/server/campaigns/service";

/**
 * Processes a single send job (one recipient). Invoked by the BullMQ worker.
 *
 * Guards make it safe to re-run: it sends only when the target is still PENDING
 * and its campaign is RUNNING, so a paused/stopped campaign's queued jobs become
 * no-ops, and a retried job never double-sends.
 */
export async function processSend(targetId: string): Promise<void> {
  const target = await prisma.campaignTarget.findUnique({
    where: { id: targetId },
    include: {
      recipient: true,
      campaign: { include: { emailTemplate: true, sendingProfile: true } },
    },
  });
  if (!target || target.status !== "PENDING") return;

  const { campaign, recipient } = target;
  if (campaign.status !== "RUNNING") return; // paused / stopped — leave PENDING

  const settings = await getSettings();
  const links = trackingLinks(settings.baseUrl, target.trackingToken);
  const values = {
    firstName: recipient.firstName,
    lastName: recipient.lastName,
    email: recipient.email,
    department: recipient.department ?? "",
    trackingLink: links.click,
    company: settings.orgName,
  };

  const subject = renderPersonalisation(campaign.emailTemplate.subject, values);
  const body = renderPersonalisation(campaign.emailTemplate.htmlBody, values);
  // Append the 1×1 open-tracking pixel (our own trusted markup, added at send time).
  const html = `${body}<img src="${links.open}" width="1" height="1" alt="" style="display:none" />`;
  const text = campaign.emailTemplate.textBody
    ? renderPersonalisation(campaign.emailTemplate.textBody, values)
    : undefined;

  const result = await sendMail(campaign.sendingProfile, {
    to: recipient.email,
    subject,
    html,
    text,
  });

  if (result.ok) {
    await prisma.campaignTarget.update({
      where: { id: targetId },
      data: { status: "SENT", sentAt: new Date(), sendError: null },
    });
    await prisma.event.create({ data: { campaignTargetId: targetId, type: "SENT" } });
  } else {
    await prisma.campaignTarget.update({
      where: { id: targetId },
      data: { status: "FAILED", sendError: result.error?.slice(0, 500) ?? "Send failed." },
    });
  }

  await markCompleteIfDone(campaign.id);
}

/** When no PENDING targets remain, a RUNNING campaign becomes COMPLETED. */
async function markCompleteIfDone(campaignId: string): Promise<void> {
  const pending = await prisma.campaignTarget.count({
    where: { campaignId, status: "PENDING" },
  });
  if (pending === 0) {
    await prisma.campaign.updateMany({
      where: { id: campaignId, status: "RUNNING" },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }
}

/** Scheduled-launch processor: at the scheduled time, start sending. */
export async function processScheduledLaunch(campaignId: string): Promise<void> {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, status: "SCHEDULED", deletedAt: null },
  });
  if (!campaign) return; // cancelled, stopped, or already running
  await startSending(campaignId);
}
