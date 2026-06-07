import { BackLink } from "@/components/BackLink";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/guard";
import { getCampaign } from "@/server/campaigns/service";
import {
  getCampaignMetrics, getCampaignTimeSeries, getCampaignResults,
} from "@/server/analytics/service";
import { EngagementRatesChart, TimeSeriesChart } from "@/components/charts";

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackLink href="/campaigns" label="Campaigns" />
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">{campaign.name} — report</h1>
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
            <p className="text-2xl font-semibold text-ink-900">{m.value}</p>
            <p className="text-xs text-ink-500">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-ink-700">Engagement rates</h2>
          <EngagementRatesChart data={rateData} />
        </div>
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-ink-700">Events over time</h2>
          {series.length ? <TimeSeriesChart data={series} /> : <p className="py-8 text-center text-sm text-ink-500">No interaction events yet.</p>}
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <h2 className="border-b border-ink-200 px-5 py-3.5 text-sm font-semibold text-ink-700">Per-recipient results</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Recipient</th>
              <th>Department</th>
              <th>Opened</th>
              <th>Clicked</th>
              <th>Submitted</th>
              <th>Reported</th>
              <th>Quiz</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i}>
                <td className="cell-strong">{r.firstName} {r.lastName}</td>
                <td>{r.department ?? "—"}</td>
                <td>{r.opened ? "✓" : "—"}</td>
                <td>{r.clicked ? "✓" : "—"}</td>
                <td>{r.submitted ? "✓" : "—"}</td>
                <td>{r.reported ? "✓" : "—"}</td>
                <td>{r.quizScore || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
