import Link from "next/link";
import { UsersRound, Plus } from "lucide-react";
import { requireAdmin } from "@/server/auth/guard";
import { listGroups } from "@/server/groups/service";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  await requireAdmin();
  const groups = await listGroups();

  return (
    <div className="space-y-6">
      <PageHeader title="Groups" description={`${groups.length} group${groups.length === 1 ? "" : "s"} for campaign targeting.`}>
        <Link href="/groups/new" className="btn-primary"><Plus className="h-4 w-4" /> New group</Link>
      </PageHeader>

      <div className="card overflow-hidden p-0">
        {groups.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="No groups yet"
            description="Create a group to target a set of recipients in a campaign."
          >
            <Link href="/groups/new" className="btn-primary"><Plus className="h-4 w-4" /> New group</Link>
          </EmptyState>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th className="text-right">Members</th>
                <th className="text-right">Manage</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id}>
                  <td className="cell-strong">{g.name}</td>
                  <td>{g.description ?? "—"}</td>
                  <td className="text-right">{g.memberCount}</td>
                  <td className="text-right">
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
