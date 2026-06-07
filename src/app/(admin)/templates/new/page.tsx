import { BackLink } from "@/components/BackLink";
import { requireAdmin } from "@/server/auth/guard";
import { getSettings } from "@/server/settings/settings";
import { TemplateForm } from "../TemplateForm";

export const dynamic = "force-dynamic";

export default async function NewTemplatePage() {
  await requireAdmin();
  const settings = await getSettings();
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <BackLink href="/templates" label="Email templates" />
        <h1 className="mt-1 text-2xl font-bold tracking-tight">New template</h1>
      </div>
      <div className="card">
        <TemplateForm mode="create" company={settings.orgName} />
      </div>
    </div>
  );
}
