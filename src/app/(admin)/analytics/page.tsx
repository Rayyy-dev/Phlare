import Link from "next/link";
import { RotateCw } from "lucide-react";
import { requireAdmin } from "@/server/auth/guard";
import {
  getOrgMetrics, getDepartmentBreakdown, getRepeatClickers,
} from "@/server/analytics/service";
import { listHighRisk } from "@/server/risk/service";
import { listCampaigns } from "@/server/campaigns/service";
import { EngagementRatesChart, DepartmentRiskChart } from "@/components/charts";
import { CampaignStatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { recomputeRiskAction } from "./actions";

export const dynamic = "force-dynamic";

function riskBadge(score: number) {
  const n = Math.round(score);
  const cls = n >= 67 ? "badge-red" : n >= 34 ? "badge-amber" : "badge-green";
  return <span className={`badge ${cls}`}>{n}</span>;
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

  const kpis = [
    { label: "Delivered", value: metrics.delivered },
    { label: "Open rate", value: `${metrics.openRate}%` },
    { label: "Click rate", value: `${metrics.clickRate}%` },
    { label: "Submit rate", value: `${metrics.submissionRate}%` },
    { label: "Report rate", value: `${metrics.reportRate}%` },
    { label: "Phish-prone", value: `${metrics.phishProne}%` },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description={`Organisation-wide results across ${campaigns} campaign${campaigns === 1 ? "" : "s"}.`}>
        <form action={recomputeRiskAction}>
          <button className="btn-secondary" type="submit"><RotateCw className="h-4 w-4" /> Recompute risk</button>
        </form>
      </PageHeader>

      {/* Charts — analytics leads with the visual analysis */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-sm font-semibold text-ink-700">Engagement rates</h2>
          <p className="mb-3 text-xs text-ink-500">Share of delivered recipients at each stage.</p>
          <EngagementRatesChart data={rateData} />
        </div>
        <div className="card">
          <h2 className="text-sm font-semibold text-ink-700">Phish-prone % by department</h2>
          <p className="mb-3 text-xs text-ink-500">Shaded green / amber / red by risk.</p>
          {departments.length ? <DepartmentRiskChart data={departments} /> : <p className="py-8 text-center text-sm text-ink-500">No data yet.</p>}
        </div>
      </div>

      {/* KPI strip — the numbers behind the charts */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((m) => (
          <div key={m.label} className="card">
            <p className="text-2xl font-semibold tracking-tight text-ink-900">{m.value}</p>
            <p className="mt-1 text-xs text-ink-500">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Risk tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card overflow-hidden p-0">
          <div className="border-b border-ink-200 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-ink-700">Highest-risk individuals</h2>
          </div>
          {highRisk.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-500">No risk scores yet.</p>
          ) : (
            <table className="data-table">
              <tbody>
                {highRisk.map((r) => (
                  <tr key={r.id}>
                    <td className="cell-strong">{r.firstName} {r.lastName}</td>
                    <td>{r.department ?? "—"}</td>
                    <td className="text-right">{riskBadge(r.riskScore)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card overflow-hidden p-0">
          <div className="border-b border-ink-200 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-ink-700">Repeat clickers (≥ 2 campaigns)</h2>
          </div>
          {repeats.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-500">None yet.</p>
          ) : (
            <table className="data-table">
              <tbody>
                {repeats.map((r) => (
                  <tr key={r.id}>
                    <td className="cell-strong">{r.name}</td>
                    <td>{r.campaigns} campaigns</td>
                    <td className="text-right">{riskBadge(r.riskScore)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Per-campaign reports */}
      <div className="card overflow-hidden p-0">
        <div className="border-b border-ink-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink-700">Per-campaign reports</h2>
        </div>
        {campaignList.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-500">No campaigns yet.</p>
        ) : (
          <table className="data-table">
            <tbody>
              {campaignList.map((c) => (
                <tr key={c.id}>
                  <td className="cell-strong">{c.name}</td>
                  <td><CampaignStatusBadge status={c.status} /></td>
                  <td className="text-right">
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
