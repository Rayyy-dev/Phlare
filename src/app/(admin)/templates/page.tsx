import Link from "next/link";
import { requireAdmin } from "@/server/auth/guard";
import { listTemplates } from "@/server/templates/service";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { deleteTemplateAction } from "./actions";

export const dynamic = "force-dynamic";

const PRINCIPLE_LABELS: Record<string, string> = {
  AUTHORITY: "Authority",
  URGENCY: "Urgency",
  SOCIAL_PROOF: "Social proof",
  RECIPROCITY: "Reciprocity",
  LIKING: "Liking",
  CURIOSITY_FEAR: "Curiosity / fear",
};

export default async function TemplatesPage() {
  await requireAdmin();
  const templates = await listTemplates();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email templates</h1>
          <p className="mt-1 text-sm text-slate-600">{templates.length} template{templates.length === 1 ? "" : "s"} in the library.</p>
        </div>
        <Link href="/templates/new" className="btn-primary">New template</Link>
      </div>

      <div className="card p-0">
        {templates.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No templates yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Difficulty</th>
                <th className="px-4 py-3">Principle</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {templates.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">
                    {t.name}
                    {t.isBuiltin && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">BUILT-IN</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{t.subject}</td>
                  <td className="px-4 py-3 text-slate-600">{t.difficulty}</td>
                  <td className="px-4 py-3 text-slate-600">{PRINCIPLE_LABELS[t.principle]}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-4">
                      <Link href={`/templates/${t.id}/edit`} className="text-sm font-medium text-brand-600 hover:text-brand-700">Edit</Link>
                      <form action={deleteTemplateAction}>
                        <input type="hidden" name="id" value={t.id} />
                        <ConfirmSubmit message={`Delete template "${t.name}"?`}>Delete</ConfirmSubmit>
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
