import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/guard";
import { getCampaign } from "@/server/campaigns/service";
import {
  getCampaignMetrics, getCampaignTimeSeries, getCampaignResults,
} from "@/server/analytics/service";
import { RatesBarChart, TimeSeriesChart } from "@/components/charts";

export const dynamic = "force-dynamic";

export default async function CampaignReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();
  const [metrics, series, results] = await Promise.all([
    getCampaignMetrics(id), getCampaignTimeSeries(id), getCampaignResults(id),
  ]);

  const rateData = [
    { name: "Open", value: metrics.openRate },
    { name: "Click", value: metrics.clickRate },
    { name: "Submit", value: metrics.submissionRate },
    { name: "Report", value: metrics.reportRate },
    { name: "Phish-prone", value: metrics.phishProne },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/campaigns" className="text-sm text-slate-500 hover:text-slate-700">← Campaigns</Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{campaign.name} — report</h1>
        </div>
        <div className="flex gap-2">
          <a href={`/campaigns/${id}/export`} className="btn-secondary">Export CSV</a>
          <a href={`/campaigns/${id}/pdf`} className="btn-primary">Export PDF</a>
        </div>
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
          <h2 className="mb-3 text-sm font-semibold text-slate-600">Events over time</h2>
          {series.length ? <TimeSeriesChart data={series} /> : <p className="text-sm text-slate-500">No interaction events yet.</p>}
        </div>
      </div>

      <div className="card p-0">
        <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">Per-recipient results</h2>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Recipient</th><th className="px-4 py-2">Department</th>
              <th className="px-4 py-2">Opened</th><th className="px-4 py-2">Clicked</th>
              <th className="px-4 py-2">Submitted</th><th className="px-4 py-2">Reported</th><th className="px-4 py-2">Quiz</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {results.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-medium">{r.firstName} {r.lastName}</td>
                <td className="px-4 py-2 text-slate-600">{r.department ?? "—"}</td>
                <td className="px-4 py-2">{r.opened ? "✓" : "—"}</td>
                <td className="px-4 py-2">{r.clicked ? "✓" : "—"}</td>
                <td className="px-4 py-2">{r.submitted ? "✓" : "—"}</td>
                <td className="px-4 py-2">{r.reported ? "✓" : "—"}</td>
                <td className="px-4 py-2 text-slate-600">{r.quizScore || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
