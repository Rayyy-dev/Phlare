import Link from "next/link";
import { AppWindow, Plus } from "lucide-react";
import { requireAdmin } from "@/server/auth/guard";
import { listLandingPages } from "@/server/landing-pages/service";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { deleteLandingPageAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function LandingPagesPage() {
  await requireAdmin();
  const pages = await listLandingPages();

  return (
    <div className="space-y-6">
      <PageHeader title="Landing pages" description={`${pages.length} page${pages.length === 1 ? "" : "s"}. The tracked link points here.`}>
        <Link href="/landing-pages/new" className="btn-primary"><Plus className="h-4 w-4" /> New landing page</Link>
      </PageHeader>

      <div className="card overflow-hidden p-0">
        {pages.length === 0 ? (
          <EmptyState
            icon={AppWindow}
            title="No landing pages yet"
            description="Create a landing page that recipients reach when they click the tracked link."
          >
            <Link href="/landing-pages/new" className="btn-primary"><Plus className="h-4 w-4" /> New landing page</Link>
          </EmptyState>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Form</th>
                <th>Difficulty</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id}>
                  <td className="cell-strong">
                    {p.name}
                    {p.isBuiltin && <span className="badge badge-neutral ml-2">Built-in</span>}
                  </td>
                  <td>{p.hasForm ? `${(p.fieldDefs as unknown[]).length} field(s)` : "No form"}</td>
                  <td>{p.difficulty}</td>
                  <td>
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
