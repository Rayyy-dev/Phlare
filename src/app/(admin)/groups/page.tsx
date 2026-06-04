import Link from "next/link";
import { requireAdmin } from "@/server/auth/guard";
import { listGroups } from "@/server/groups/service";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  await requireAdmin();
  const groups = await listGroups();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Groups</h1>
          <p className="mt-1 text-sm text-slate-600">{groups.length} group{groups.length === 1 ? "" : "s"} for campaign targeting.</p>
        </div>
        <Link href="/groups/new" className="btn-primary">New group</Link>
      </div>

      <div className="card p-0">
        {groups.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            No groups yet. Create one to target a set of recipients in a campaign.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Members</th>
                <th className="px-4 py-3 text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groups.map((g) => (
                <tr key={g.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{g.name}</td>
                  <td className="px-4 py-3 text-slate-600">{g.description ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{g.memberCount}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/groups/${g.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">Open</Link>
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
