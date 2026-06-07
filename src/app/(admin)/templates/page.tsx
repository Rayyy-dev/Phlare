import Link from "next/link";
import { Mail, Plus } from "lucide-react";
import { requireAdmin } from "@/server/auth/guard";
import { listTemplates } from "@/server/templates/service";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
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
      <PageHeader title="Email templates" description={`${templates.length} template${templates.length === 1 ? "" : "s"} in the library.`}>
        <Link href="/templates/new" className="btn-primary"><Plus className="h-4 w-4" /> New template</Link>
      </PageHeader>

      <div className="card overflow-hidden p-0">
        {templates.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No templates yet"
            description="Create an email template to use as the lure in a campaign."
          >
            <Link href="/templates/new" className="btn-primary"><Plus className="h-4 w-4" /> New template</Link>
          </EmptyState>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Subject</th>
                <th>Difficulty</th>
                <th>Principle</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td className="cell-strong">
                    {t.name}
                    {t.isBuiltin && <span className="badge badge-neutral ml-2">Built-in</span>}
                  </td>
                  <td>{t.subject}</td>
                  <td>{t.difficulty}</td>
                  <td>{PRINCIPLE_LABELS[t.principle]}</td>
                  <td>
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
