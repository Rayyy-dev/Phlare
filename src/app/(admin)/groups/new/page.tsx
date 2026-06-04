import Link from "next/link";
import { requireAdmin } from "@/server/auth/guard";
import { GroupForm } from "../GroupForm";

export const dynamic = "force-dynamic";

export default async function NewGroupPage() {
  await requireAdmin();
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/groups" className="text-sm text-slate-500 hover:text-slate-700">← Groups</Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">New group</h1>
      </div>
      <div className="card">
        <GroupForm mode="create" />
      </div>
    </div>
  );
}
