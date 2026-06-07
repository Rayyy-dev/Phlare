import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { requireAdmin } from "@/server/auth/guard";
import { getCampaign, getCampaignStats } from "@/server/campaigns/service";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { LaunchControl } from "../LaunchControl";
import {
  pauseCampaignAction,
  resumeCampaignAction,
  stopCampaignAction,
  deleteCampaignAction,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();
  const stats = await getCampaignStats(id);

  const scheduledFuture = campaign.scheduledAt != null && campaign.scheduledAt.getTime() > Date.now();

  const metrics = [
    { label: "Targets", value: stats.targets },
    { label: "Sent", value: stats.sent },
    { label: "Opened", value: stats.opened },
    { label: "Clicked", value: stats.clicked },
    { label: "Submitted", value: stats.submitted },
    { label: "Reported", value: stats.reported },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <BackLink href="/campaigns" label="Campaigns" />
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{campaign.name}</h1>
          <p className="mt-1 text-sm text-slate-500">Status: <strong>{campaign.status}</strong></p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/campaigns/${campaign.id}/report`} className="btn-secondary">View report</Link>
          {(campaign.status === "DRAFT" || campaign.status === "COMPLETED" || campaign.status === "STOPPED") && (
            <form action={deleteCampaignAction}>
              <input type="hidden" name="id" value={campaign.id} />
              <ConfirmSubmit className="btn-secondary text-red-600" message={`Delete campaign "${campaign.name}"?`}>Delete</ConfirmSubmit>
            </form>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {metrics.map((m) => (
          <div key={m.label} className="card text-center">
            <p className="text-2xl font-bold">{m.value}</p>
            <p className="text-xs text-slate-500">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="card space-y-2 text-sm">
        <h2 className="text-sm font-semibold text-slate-600">Configuration</h2>
        <Row label="Email template" value={campaign.emailTemplate.name} />
        <Row label="Landing page" value={campaign.landingPage.name} />
        <Row label="Sending profile" value={campaign.sendingProfile.name} />
        <Row label="Groups" value={campaign.groups.map((g) => g.group.name).join(", ")} />
        <Row label="Send rate" value={`${campaign.throttlePerMinute} / min`} />
        <Row label="Schedule" value={campaign.scheduledAt ? campaign.scheduledAt.toLocaleString() : "On launch"} />
        {campaign.authorizedAt && (
          <Row label="Authorised" value={campaign.authorizedAt.toLocaleString()} />
        )}
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-600">Controls</h2>

        {campaign.status === "DRAFT" && <LaunchControl campaignId={campaign.id} scheduled={scheduledFuture} />}

        {campaign.status === "SCHEDULED" && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Scheduled to launch automatically at {campaign.scheduledAt?.toLocaleString()}.</p>
            <LifecycleButton action={stopCampaignAction} id={campaign.id} label="Stop" confirm={`Stop "${campaign.name}"?`} danger />
          </div>
        )}

        {campaign.status === "RUNNING" && (
          <div className="flex gap-3">
            <LifecycleButton action={pauseCampaignAction} id={campaign.id} label="Pause" />
            <LifecycleButton action={stopCampaignAction} id={campaign.id} label="Stop" confirm={`Stop "${campaign.name}"?`} danger />
          </div>
        )}

        {campaign.status === "PAUSED" && (
          <div className="flex gap-3">
            <LifecycleButton action={resumeCampaignAction} id={campaign.id} label="Resume" />
            <LifecycleButton action={stopCampaignAction} id={campaign.id} label="Stop" confirm={`Stop "${campaign.name}"?`} danger />
          </div>
        )}

        {(campaign.status === "COMPLETED" || campaign.status === "STOPPED") && (
          <p className="text-sm text-slate-500">This campaign is {campaign.status.toLowerCase()}. No further sends will occur.</p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-t border-slate-100 py-1.5 first:border-t-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800">{value}</span>
    </div>
  );
}

function LifecycleButton({
  action,
  id,
  label,
  confirm,
  danger,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  label: string;
  confirm?: string;
  danger?: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      {confirm ? (
        <ConfirmSubmit className={`btn-secondary ${danger ? "text-red-600" : ""}`} message={confirm}>{label}</ConfirmSubmit>
      ) : (
        <button type="submit" className="btn-secondary">{label}</button>
      )}
    </form>
  );
}
