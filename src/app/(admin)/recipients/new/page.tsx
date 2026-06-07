import { BackLink } from "@/components/BackLink";
import { requireAdmin } from "@/server/auth/guard";
import { RecipientForm } from "../RecipientForm";

export const dynamic = "force-dynamic";

export default async function NewRecipientPage() {
  await requireAdmin();
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <BackLink href="/recipients" label="Recipients" />
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Add recipient</h1>
      </div>
      <div className="card">
        <RecipientForm mode="create" />
      </div>
    </div>
  );
}
