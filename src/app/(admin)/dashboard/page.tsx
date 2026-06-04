import { requireAdmin } from "@/server/auth/guard";
import { prisma } from "@/server/db";

/**
 * Dashboard. In Phase 1 this confirms the stack is wired end-to-end (auth →
 * guard → DB) and shows high-level counts. Rich analytics arrive in Phase 6.
 */
export default async function DashboardPage() {
  const admin = await requireAdmin();

  const [recipients, campaigns, templates] = await Promise.all([
    prisma.recipient.count({ where: { deletedAt: null } }),
    prisma.campaign.count({ where: { deletedAt: null } }),
    prisma.emailTemplate.count({ where: { deletedAt: null } }),
  ]);

  const stats = [
    { label: "Recipients", value: recipients, hint: "Phase 2" },
    { label: "Email templates", value: templates, hint: "Phase 3" },
    { label: "Campaigns", value: campaigns, hint: "Phase 4" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Welcome back, {admin.name.split(" ")[0]}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <p className="text-sm font-medium text-slate-500">{s.label}</p>
            <p className="mt-2 text-3xl font-bold">{s.value}</p>
            <p className="mt-1 text-xs text-slate-400">Available in {s.hint}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold">Phase 1 complete</h2>
        <p className="mt-2 text-sm text-slate-600">
          The foundation is in place: authenticated admin area, server-side
          sessions, PostgreSQL via Prisma, the background-worker process, and the
          one-command Docker stack with a local mail-catcher. Subsequent phases
          add recipients, content, the campaign engine, just-in-time learning,
          and analytics.
        </p>
      </div>
    </div>
  );
}
