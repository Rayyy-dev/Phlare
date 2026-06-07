import { BackLink } from "@/components/BackLink";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/guard";
import { getLandingPage } from "@/server/landing-pages/service";
import { LandingPageForm } from "../../LandingPageForm";
import type { LandingFieldDef, LandingPageInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

export default async function EditLandingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const page = await getLandingPage(id);
  if (!page) notFound();

  const formValue = {
    id: page.id,
    name: page.name,
    htmlBody: page.htmlBody,
    hasForm: page.hasForm,
    fieldDefs: (page.fieldDefs as LandingFieldDef[]) ?? [],
    difficulty: page.difficulty,
  } satisfies LandingPageInput & { id: string };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <BackLink href="/landing-pages" label="Landing pages" />
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">Edit landing page</h1>
      </div>
      <div className="card">
        <LandingPageForm mode="edit" page={formValue} />
      </div>
    </div>
  );
}
