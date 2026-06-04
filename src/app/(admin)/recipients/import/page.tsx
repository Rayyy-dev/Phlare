import Link from "next/link";
import { requireAdmin } from "@/server/auth/guard";
import { listGroups } from "@/server/groups/service";
import { ImportWizard } from "./ImportWizard";

export const dynamic = "force-dynamic";

export default async function ImportRecipientsPage() {
  await requireAdmin();
  const groups = await listGroups();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/recipients" className="text-sm text-slate-500 hover:text-slate-700">← Recipients</Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Import recipients from CSV</h1>
        <p className="mt-1 text-sm text-slate-600">
          Upload a CSV, map its columns, and review the result. Importing is
          idempotent — re-importing the same file creates no duplicates.
        </p>
      </div>
      <div className="card">
        <ImportWizard groups={groups.map((g) => ({ id: g.id, name: g.name }))} />
      </div>
    </div>
  );
}
