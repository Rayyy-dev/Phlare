import { BackLink } from "@/components/BackLink";
import { requireAdmin } from "@/server/auth/guard";
import { LandingPageForm } from "../LandingPageForm";

export const dynamic = "force-dynamic";

export default async function NewLandingPage() {
  await requireAdmin();
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <BackLink href="/landing-pages" label="Landing pages" />
        <h1 className="mt-1 text-2xl font-bold tracking-tight">New landing page</h1>
      </div>
      <div className="card">
        <LandingPageForm mode="create" />
      </div>
    </div>
  );
}
