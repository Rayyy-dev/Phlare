import Link from "next/link";
import { Megaphone, Plus } from "lucide-react";
import { requireAdmin } from "@/server/auth/guard";
import { listCampaigns } from "@/server/campaigns/service";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { CampaignStatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  await requireAdmin();
  const campaigns = await listCampaigns();

  return (
    <div className="space-y-6">
      <PageHeader title="Campaigns" description={`${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"}.`}>
        <Link href="/campaigns/new" className="btn-primary"><Plus className="h-4 w-4" /> New campaign</Link>
      </PageHeader>

      <div className="card overflow-hidden p-0">
        {campaigns.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No campaigns yet"
            description="Create a campaign to send a simulation to your recipients."
          >
            <Link href="/campaigns/new" className="btn-primary"><Plus className="h-4 w-4" /> New campaign</Link>
          </EmptyState>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Template</th>
                <th className="text-right">Targets</th>
                <th className="text-right">View</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td className="cell-strong">
                    <Link href={`/campaigns/${c.id}`} className="text-brand-600 hover:text-brand-700">{c.name}</Link>
                  </td>
                  <td><CampaignStatusBadge status={c.status} /></td>
                  <td>{c.emailTemplate.name}</td>
                  <td className="text-right">{c._count.targets}</td>
                  <td className="text-right">
                    <Link href={`/campaigns/${c.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
