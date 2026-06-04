import Link from "next/link";
import { requireAdmin } from "@/server/auth/guard";
import { listLandingPages } from "@/server/landing-pages/service";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { deleteLandingPageAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function LandingPagesPage() {
  await requireAdmin();
  const pages = await listLandingPages();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Landing pages</h1>
          <p className="mt-1 text-sm text-slate-600">{pages.length} page{pages.length === 1 ? "" : "s"}. The tracked link points here.</p>
        </div>
        <Link href="/landing-pages/new" className="btn-primary">New landing page</Link>
      </div>

      <div className="card p-0">
        {pages.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No landing pages yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Form</th>
                <th className="px-4 py-3">Difficulty</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pages.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">
                    {p.name}
                    {p.isBuiltin && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">BUILT-IN</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.hasForm ? `${(p.fieldDefs as unknown[]).length} field(s)` : "No form"}</td>
                  <td className="px-4 py-3 text-slate-600">{p.difficulty}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-4">
                      <Link href={`/landing-pages/${p.id}/edit`} className="text-sm font-medium text-brand-600 hover:text-brand-700">Edit</Link>
                      <form action={deleteLandingPageAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <ConfirmSubmit message={`Delete landing page "${p.name}"?`}>Delete</ConfirmSubmit>
                      </form>
                    </div>
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
