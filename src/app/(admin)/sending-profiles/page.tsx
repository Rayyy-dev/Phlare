import Link from "next/link";
import { Send, Plus } from "lucide-react";
import { requireAdmin } from "@/server/auth/guard";
import { listProfiles } from "@/server/sending-profiles/service";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { deleteProfileAction } from "./actions";

export const dynamic = "force-dynamic";

function TestBadge({ at, ok }: { at: Date | null; ok: boolean | null }) {
  if (!at) return <span className="badge badge-neutral">Never tested</span>;
  return ok
    ? <span className="badge badge-green">Passed</span>
    : <span className="badge badge-red">Failed</span>;
}

export default async function SendingProfilesPage() {
  await requireAdmin();
  const profiles = await listProfiles();

  return (
    <div className="space-y-6">
      <PageHeader title="Sending profiles" description={`${profiles.length} SMTP profile${profiles.length === 1 ? "" : "s"}. Passwords are encrypted at rest.`}>
        <Link href="/sending-profiles/new" className="btn-primary"><Plus className="h-4 w-4" /> New profile</Link>
      </PageHeader>

      <div className="card overflow-hidden p-0">
        {profiles.length === 0 ? (
          <EmptyState
            icon={Send}
            title="No sending profiles yet"
            description={
              <>
                Add one — for the demo, point it at the local Mailpit catcher
                (host <code>localhost</code>, port <code>1025</code>, security <code>NONE</code>).
              </>
            }
          >
            <Link href="/sending-profiles/new" className="btn-primary"><Plus className="h-4 w-4" /> New profile</Link>
          </EmptyState>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Host</th>
                <th>From</th>
                <th>Last test</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td className="cell-strong">{p.name}</td>
                  <td>{p.host}:{p.port} <span className="text-ink-400">({p.security})</span></td>
                  <td>{p.fromName} &lt;{p.fromEmail}&gt;</td>
                  <td><TestBadge at={p.lastTestedAt} ok={p.lastTestOk} /></td>
                  <td>
                    <div className="flex items-center justify-end gap-4">
                      <Link href={`/sending-profiles/${p.id}/edit`} className="text-sm font-medium text-brand-600 hover:text-brand-700">Edit</Link>
                      <form action={deleteProfileAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <ConfirmSubmit message={`Delete sending profile "${p.name}"?`}>Delete</ConfirmSubmit>
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
