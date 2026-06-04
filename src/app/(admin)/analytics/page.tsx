import Link from "next/link";
import { requireAdmin } from "@/server/auth/guard";
import {
  getOrgMetrics, getDepartmentBreakdown, getRepeatClickers,
} from "@/server/analytics/service";
import { listHighRisk } from "@/server/risk/service";
import { listCampaigns } from "@/server/campaigns/service";
import { RatesBarChart, DepartmentBarChart } from "@/components/charts";
import { recomputeRiskAction } from "./actions";

export const dynamic = "force-dynamic";

function riskBadge(score: number) {
  const tone = score >= 67 ? "bg-red-100 text-red-700" : score >= 34 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700";
  return <span className={`rounded px-2 py-0.5 text-xs font-semibold ${tone}`}>{score}</span>;
}

export default async function AnalyticsPage() {
  await requireAdmin();
  const [{ metrics, campaigns }, departments, repeats, highRisk, campaignList] = await Promise.all([
    getOrgMetrics(), getDepartmentBreakdown(), getRepeatClickers(), listHighRisk(10), listCampaigns(),
  ]);

  const rateData = [
    { name: "Open", value: metrics.openRate },
    { name: "Click", value: metrics.clickRate },
    { name: "Submit", value: metrics.submissionRate },
    { name: "Report", value: metrics.reportRate },
    { name: "Phish-prone", value: metrics.phishProne },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-slate-600">Organisation-wide results across {campaigns} campaign{campaigns === 1 ? "" : "s"}.</p>
        </div>
        <form action={recomputeRiskAction}><button className="btn-secondary" type="submit">Recompute risk</button></form>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Delivered", value: metrics.delivered },
          { label: "Open rate", value: `${metrics.openRate}%` },
          { label: "Click rate", value: `${metrics.clickRate}%` },
          { label: "Submit rate", value: `${metrics.submissionRate}%` },
          { label: "Report rate", value: `${metrics.reportRate}%` },
          { label: "Phish-prone", value: `${metrics.phishProne}%` },
        ].map((m) => (
          <div key={m.label} className="card text-center">
            <p className="text-2xl font-bold">{m.value}</p>
            <p className="text-xs text-slate-500">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-slate-600">Engagement rates</h2>
          <RatesBarChart data={rateData} />
        </div>
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-slate-600">Phish-prone % by department</h2>
          {departments.length ? <DepartmentBarChart data={departments} /> : <p className="text-sm text-slate-500">No data yet.</p>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-0">
          <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">Highest-risk individuals</h2>
          {highRisk.length === 0 ? <p className="p-6 text-sm text-slate-500">No risk scores yet.</p> : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {highRisk.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium">{r.firstName} {r.lastName}</td>
                    <td className="px-4 py-2 text-slate-500">{r.department ?? "—"}</td>
                    <td className="px-4 py-2 text-right">{riskBadge(Math.round(r.riskScore))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card p-0">
          <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">Repeat clickers (≥ 2 campaigns)</h2>
          {repeats.length === 0 ? <p className="p-6 text-sm text-slate-500">None yet.</p> : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {repeats.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium">{r.name}</td>
                    <td className="px-4 py-2 text-slate-500">{r.campaigns} campaigns</td>
                    <td className="px-4 py-2 text-right">{riskBadge(Math.round(r.riskScore))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card p-0">
        <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">Per-campaign reports</h2>
        {campaignList.length === 0 ? <p className="p-6 text-sm text-slate-500">No campaigns yet.</p> : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {campaignList.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium">{c.name}</td>
                  <td className="px-4 py-2 text-slate-500">{c.status}</td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/campaigns/${c.id}/report`} className="text-sm font-medium text-brand-600 hover:text-brand-700">View report</Link>
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
