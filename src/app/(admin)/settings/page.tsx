import { requireAdmin } from "@/server/auth/guard";
import { getSettings, listAuditLog } from "@/server/settings/settings";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAdmin();
  const [settings, audit] = await Promise.all([getSettings(), listAuditLog(50)]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Settings</h1>
        <p className="mt-1 text-sm text-ink-600">Organisation configuration and the audit log.</p>
      </div>

      <div className="card">
        <SettingsForm
          settings={{
            orgName: settings.orgName,
            baseUrl: settings.baseUrl,
            defaultThrottlePerMinute: settings.defaultThrottlePerMinute,
            retentionDays: settings.retentionDays,
            reportEmail: settings.reportEmail,
          }}
        />
      </div>

      <div className="card p-0">
        <h2 className="border-b border-ink-200 px-4 py-3 text-sm font-semibold text-ink-600">Audit log</h2>
        {audit.length === 0 ? (
          <p className="p-6 text-sm text-ink-500">No recorded actions yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase text-ink-500">
              <tr><th className="px-4 py-2">When</th><th className="px-4 py-2">Actor</th><th className="px-4 py-2">Action</th><th className="px-4 py-2">Entity</th></tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {audit.map((a) => (
                <tr key={a.id} className="hover:bg-ink-50">
                  <td className="px-4 py-2 text-ink-500">{a.createdAt.toLocaleString()}</td>
                  <td className="px-4 py-2 text-ink-600">{a.actor?.name ?? "system"}</td>
                  <td className="px-4 py-2 font-medium">{a.action}</td>
                  <td className="px-4 py-2 text-ink-500">{a.entityType ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
