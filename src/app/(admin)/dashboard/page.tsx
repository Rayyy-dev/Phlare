import { requireAdmin } from "@/server/auth/guard";
import { prisma } from "@/server/db";

/**
 * Dashboard. In Phase 1 this confirms the stack is wired end-to-end (auth →
 * guard → DB) and shows high-level counts. Rich analytics arrive in Phase 6.
 */
export default async function DashboardPage() {
  const admin = await requireAdmin();

  const [recipients, groups, templates, campaigns] = await Promise.all([
    prisma.recipient.count({ where: { deletedAt: null } }),
    prisma.group.count({ where: { deletedAt: null } }),
    prisma.emailTemplate.count({ where: { deletedAt: null } }),
    prisma.campaign.count({ where: { deletedAt: null } }),
  ]);

  const stats = [
    { label: "Recipients", value: recipients, hint: null },
    { label: "Groups", value: groups, hint: null },
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <p className="text-sm font-medium text-slate-500">{s.label}</p>
            <p className="mt-2 text-3xl font-bold">{s.value}</p>
            <p className="mt-1 text-xs text-slate-400">
              {s.hint ? `Available in ${s.hint}` : "Active"}
            </p>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold">Getting started</h2>
        <p className="mt-2 text-sm text-slate-600">
          Add your people under <strong>Recipients</strong> — individually or via
          CSV import — and organise them into <strong>Groups</strong> for
          targeting. Email templates, sending profiles, and campaigns arrive in
          the next phases.
        </p>
      </div>
    </div>
  );
}
