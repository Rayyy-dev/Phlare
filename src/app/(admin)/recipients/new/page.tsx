import Link from "next/link";
import { requireAdmin } from "@/server/auth/guard";
import { RecipientForm } from "../RecipientForm";

export const dynamic = "force-dynamic";

export default async function NewRecipientPage() {
  await requireAdmin();
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/recipients" className="text-sm text-slate-500 hover:text-slate-700">← Recipients</Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Add recipient</h1>
      </div>
      <div className="card">
        <RecipientForm mode="create" />
      </div>
    </div>
  );
}
