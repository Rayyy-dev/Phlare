import Link from "next/link";
import { Users, Megaphone, ShieldAlert, Flag, ArrowUpRight, Plus, type LucideIcon } from "lucide-react";
import { requireAdmin } from "@/server/auth/guard";
import { prisma } from "@/server/db";
import { getOrgMetrics } from "@/server/analytics/service";
import { listCampaigns } from "@/server/campaigns/service";
import { listHighRisk } from "@/server/risk/service";
import { CampaignStatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

function riskBadge(score: number) {
  const n = Math.round(score);
  const cls = n >= 67 ? "badge-red" : n >= 34 ? "badge-amber" : "badge-green";
  return <span className={`badge ${cls}`}>{n}</span>;
}

export default async function DashboardPage() {
  const admin = await requireAdmin();
  const [recipients, { metrics }, campaigns, highRisk] = await Promise.all([
    prisma.recipient.count({ where: { deletedAt: null } }),
    getOrgMetrics(),
    listCampaigns(),
    listHighRisk(5),
  ]);

  const active = campaigns.filter((c) => c.status === "RUNNING" || c.status === "SCHEDULED").length;
  const recent = campaigns.slice(0, 5);

  const stats: { label: string; value: string | number; hint: string; Icon: LucideIcon }[] = [
    { label: "Recipients", value: recipients, hint: "in directory", Icon: Users },
    { label: "Campaigns", value: campaigns.length, hint: `${active} active`, Icon: Megaphone },
    { label: "Phish-prone", value: `${metrics.phishProne}%`, hint: `${metrics.delivered} delivered`, Icon: ShieldAlert },
    { label: "Reported", value: `${metrics.reportRate}%`, hint: `${metrics.reported} reported`, Icon: Flag },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-500">Welcome back, {admin.name.split(" ")[0]}.</p>
        </div>
        <Link href="/campaigns/new" className="btn-primary">
          <Plus className="h-4 w-4" /> New campaign
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink-500">{s.label}</p>
              <s.Icon className="h-4 w-4 text-ink-300" />
            </div>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-ink-900">{s.value}</p>
            <p className="mt-1 text-xs text-ink-400">{s.hint}</p>
          </div>
        ))}
      </div>

      {campaigns.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <Megaphone className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-ink-900">No campaigns yet</h2>
          <p className="mt-1 max-w-md text-sm text-ink-500">
            Add your people under <strong className="font-medium text-ink-700">Recipients</strong> — individually
            or via CSV — group them for targeting, then launch your first simulation.
          </p>
          <div className="mt-5 flex gap-3">
            <Link href="/recipients" className="btn-secondary">Add recipients</Link>
            <Link href="/campaigns/new" className="btn-primary">New campaign</Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent campaigns */}
          <div className="card p-0 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-ink-700">Recent campaigns</h2>
              <Link href="/campaigns" className="text-sm font-medium text-brand-600 hover:text-brand-700">View all</Link>
            </div>
            <ul className="divide-y divide-ink-100">
              {recent.map((c) => (
                <li key={c.id}>
                  <Link href={`/campaigns/${c.id}`} className="group flex items-center gap-4 px-5 py-3 transition hover:bg-ink-50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{c.name}</p>
                      <p className="truncate text-xs text-ink-500">
                        {c.emailTemplate?.name ?? "No template"} · {c._count.targets} recipient{c._count.targets === 1 ? "" : "s"}
                      </p>
                    </div>
                    <CampaignStatusBadge status={c.status} />
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-300 transition group-hover:text-ink-500" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Highest-risk people */}
          <div className="card p-0">
            <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-ink-700">Highest-risk people</h2>
              <Link href="/analytics" className="text-sm font-medium text-brand-600 hover:text-brand-700">Analytics</Link>
            </div>
            {highRisk.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-500">No risk scores yet.</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {highRisk.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{r.firstName} {r.lastName}</p>
                      <p className="truncate text-xs text-ink-500">{r.department ?? "Unassigned"}</p>
                    </div>
                    {riskBadge(r.riskScore)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
