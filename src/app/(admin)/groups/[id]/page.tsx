import { BackLink } from "@/components/BackLink";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/guard";
import { getGroupWithMembers } from "@/server/groups/service";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { GroupForm } from "../GroupForm";
import {
  deleteGroupAction,
  addMembersAction,
  removeMemberAction,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const data = await getGroupWithMembers(id);
  if (!data) notFound();
  const { group, members, candidates } = data;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <BackLink href="/groups" label="Groups" />
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{group.name}</h1>
          <p className="mt-1 text-sm text-slate-600">{members.length} member{members.length === 1 ? "" : "s"}.</p>
        </div>
        <form action={deleteGroupAction}>
          <input type="hidden" name="id" value={group.id} />
          <ConfirmSubmit
            className="btn-secondary text-red-600"
            message={`Delete the group "${group.name}"? Members are not deleted, only the group.`}
          >
            Delete group
          </ConfirmSubmit>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-slate-600">Group details</h2>
          <GroupForm mode="edit" group={group} />
        </div>

        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-slate-600">Add members</h2>
          {candidates.length === 0 ? (
            <p className="text-sm text-slate-500">All active recipients are already in this group.</p>
          ) : (
            <form action={addMembersAction} className="space-y-3">
              <input type="hidden" name="groupId" value={group.id} />
              <select name="recipientIds" multiple size={8} className="input h-auto">
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} — {c.email}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">Hold Ctrl/Cmd to select several.</p>
              <button type="submit" className="btn-primary">Add selected</button>
            </form>
          )}
        </div>
      </div>

      <div className="card p-0">
        <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">Members</h2>
        {members.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No members yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Department</th>
                <th className="px-4 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium">{m.firstName} {m.lastName}</td>
                  <td className="px-4 py-2 text-slate-600">{m.email}</td>
                  <td className="px-4 py-2 text-slate-600">{m.department ?? "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <form action={removeMemberAction}>
                      <input type="hidden" name="groupId" value={group.id} />
                      <input type="hidden" name="recipientId" value={m.id} />
                      <ConfirmSubmit message={`Remove ${m.firstName} ${m.lastName} from ${group.name}?`}>
                        Remove
                      </ConfirmSubmit>
                    </form>
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
