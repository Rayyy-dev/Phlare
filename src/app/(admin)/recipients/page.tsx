import Link from "next/link";
import { requireAdmin } from "@/server/auth/guard";
import {
  listRecipients,
  listDepartments,
  RECIPIENTS_PAGE_SIZE,
} from "@/server/recipients/service";
import { listGroups } from "@/server/groups/service";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recipients</h1>
          <p className="mt-1 text-sm text-slate-600">{result.total} active recipient{result.total === 1 ? "" : "s"}.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/recipients/import" className="btn-secondary">Import CSV</Link>
          <Link href="/recipients/new" className="btn-primary">Add recipient</Link>
        </div>
      </div>

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
        {(sp.q || sp.department || sp.group) && (
          <Link href="/recipients" className="text-sm text-slate-500 hover:text-slate-700">Clear</Link>
        )}
      </form>

      <div className="card overflow-hidden p-0">
        {result.items.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            No recipients found. Add one or import a CSV to get started.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Groups</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.items.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{r.firstName} {r.lastName}</td>
                  <td className="px-4 py-3 text-slate-600">{r.email}</td>
                  <td className="px-4 py-3 text-slate-600">{r.department ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{r.position ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.memberships.length === 0
                      ? "—"
                      : r.memberships.map((m) => m.group.name).join(", ")}
                  </td>
                  <td className="px-4 py-3">
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
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Showing {from}–{to} of {result.total}</span>
          <div className="flex gap-2">
            {result.page > 1 && <Link href={pageHref(result.page - 1)} className="btn-secondary">Previous</Link>}
            <span className="px-2 py-2">Page {result.page} of {result.pageCount}</span>
            {result.page < result.pageCount && <Link href={pageHref(result.page + 1)} className="btn-secondary">Next</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
