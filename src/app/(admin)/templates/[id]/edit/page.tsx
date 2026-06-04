import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/guard";
import { getSettings } from "@/server/settings/settings";
import { getTemplate } from "@/server/templates/service";
import { TemplateForm } from "../../TemplateForm";
import type { EmailTemplateInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const [template, settings] = await Promise.all([getTemplate(id), getSettings()]);
  if (!template) notFound();

  // Cast the stored row into the form's input shape (redFlags is Json in the DB).
  const formValue = {
    id: template.id,
    name: template.name,
    subject: template.subject,
    senderName: template.senderName,
    senderEmail: template.senderEmail,
    htmlBody: template.htmlBody,
    textBody: template.textBody ?? undefined,
    difficulty: template.difficulty,
    principle: template.principle,
    redFlags: (template.redFlags as string[]) ?? [],
  } satisfies EmailTemplateInput & { id: string };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <Link href="/templates" className="text-sm text-slate-500 hover:text-slate-700">← Email templates</Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Edit template</h1>
      </div>
      <div className="card">
        <TemplateForm mode="edit" template={formValue} company={settings.orgName} />
      </div>
    </div>
  );
}
