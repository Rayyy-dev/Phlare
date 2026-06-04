import Link from "next/link";
import { requireAdmin } from "@/server/auth/guard";
import { listCampaigns } from "@/server/campaigns/service";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SCHEDULED: "bg-blue-100 text-blue-700",
  RUNNING: "bg-green-100 text-green-700",
  PAUSED: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-slate-200 text-slate-700",
  STOPPED: "bg-red-100 text-red-700",
};

export default async function CampaignsPage() {
  await requireAdmin();
  const campaigns = await listCampaigns();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="mt-1 text-sm text-slate-600">{campaigns.length} campaign{campaigns.length === 1 ? "" : "s"}.</p>
        </div>
        <Link href="/campaigns/new" className="btn-primary">New campaign</Link>
      </div>

      <div className="card p-0">
        {campaigns.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No campaigns yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3 text-right">Targets</th>
                <th className="px-4 py-3 text-right">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/campaigns/${c.id}`} className="text-brand-600 hover:text-brand-700">{c.name}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[c.status]}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.emailTemplate.name}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{c._count.targets}</td>
                  <td className="px-4 py-3 text-right">
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
