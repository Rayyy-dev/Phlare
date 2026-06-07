import Link from "next/link";
import { Users } from "lucide-react";
import { requireAdmin } from "@/server/auth/guard";
import {
  listRecipients,
  listDepartments,
  RECIPIENTS_PAGE_SIZE,
} from "@/server/recipients/service";
import { listGroups } from "@/server/groups/service";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { AddRecipientButton } from "./AddRecipientButton";
import { deleteRecipientAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function RecipientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Number(sp.page) || 1;

  const [result, departments, groups] = await Promise.all([
    listRecipients({
      page,
      query: sp.q,
      department: sp.department,
      groupId: sp.group,
    }),
    listDepartments(),
    listGroups(),
  ]);

  const from = result.total === 0 ? 0 : (result.page - 1) * RECIPIENTS_PAGE_SIZE + 1;
  const to = Math.min(result.page * RECIPIENTS_PAGE_SIZE, result.total);
  const filtered = Boolean(sp.q || sp.department || sp.group);

  // Preserve active filters when building pagination links.
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (sp.department) params.set("department", sp.department);
    if (sp.group) params.set("group", sp.group);
    params.set("page", String(p));
    return `/recipients?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Recipients" description={`${result.total} active recipient${result.total === 1 ? "" : "s"}.`}>
        <Link href="/recipients/import" className="btn-secondary">Import CSV</Link>
        <AddRecipientButton />
      </PageHeader>

      <form method="get" className="card flex flex-wrap items-end gap-3">
        <div className="grow">
          <label className="label" htmlFor="q">Search</label>
          <input id="q" name="q" defaultValue={sp.q ?? ""} placeholder="Name or email" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="department">Department</label>
          <select id="department" name="department" defaultValue={sp.department ?? ""} className="input">
            <option value="">All</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="group">Group</label>
          <select id="group" name="group" defaultValue={sp.group ?? ""} className="input">
            <option value="">All</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-secondary">Apply</button>
        {filtered && (
          <Link href="/recipients" className="btn-ghost">Clear</Link>
        )}
      </form>

      <div className="card overflow-hidden p-0">
        {result.items.length === 0 ? (
          <EmptyState
            icon={Users}
            title={filtered ? "No matching recipients" : "No recipients yet"}
            description={filtered ? "Try adjusting or clearing your filters." : "Add people individually or import a CSV to get started."}
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Position</th>
                <th>Groups</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((r) => (
                <tr key={r.id}>
                  <td className="cell-strong">{r.firstName} {r.lastName}</td>
                  <td>{r.email}</td>
                  <td>{r.department ?? "—"}</td>
                  <td>{r.position ?? "—"}</td>
                  <td>
                    {r.memberships.length === 0
                      ? "—"
                      : r.memberships.map((m) => m.group.name).join(", ")}
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-4">
                      <Link href={`/recipients/${r.id}/edit`} className="text-sm font-medium text-brand-600 hover:text-brand-700">Edit</Link>
                      <form action={deleteRecipientAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <ConfirmSubmit message={`Delete ${r.firstName} ${r.lastName}? They will be removed from lists and future campaigns.`}>
                          Delete
                        </ConfirmSubmit>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {result.pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-ink-500">
          <span>Showing {from}–{to} of {result.total}</span>
          <div className="flex items-center gap-2">
            {result.page > 1 && <Link href={pageHref(result.page - 1)} className="btn-secondary">Previous</Link>}
            <span className="px-2">Page {result.page} of {result.pageCount}</span>
            {result.page < result.pageCount && <Link href={pageHref(result.page + 1)} className="btn-secondary">Next</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
