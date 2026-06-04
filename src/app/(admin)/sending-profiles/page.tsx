import Link from "next/link";
import { requireAdmin } from "@/server/auth/guard";
import { listProfiles } from "@/server/sending-profiles/service";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { deleteProfileAction } from "./actions";

export const dynamic = "force-dynamic";

function testLabel(at: Date | null, ok: boolean | null) {
  if (!at) return "Never tested";
  return ok ? "Passed" : "Failed";
}

export default async function SendingProfilesPage() {
  await requireAdmin();
  const profiles = await listProfiles();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sending profiles</h1>
          <p className="mt-1 text-sm text-slate-600">{profiles.length} SMTP profile{profiles.length === 1 ? "" : "s"}. Passwords are encrypted at rest.</p>
        </div>
        <Link href="/sending-profiles/new" className="btn-primary">New profile</Link>
      </div>

      <div className="card p-0">
        {profiles.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            No sending profiles yet. Add one — for the demo, point it at the local
            Mailpit catcher (host <code>localhost</code>, port <code>1025</code>, security <code>NONE</code>).
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Host</th>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">Last test</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-slate-600">{p.host}:{p.port} <span className="text-slate-400">({p.security})</span></td>
                  <td className="px-4 py-3 text-slate-600">{p.fromName} &lt;{p.fromEmail}&gt;</td>
                  <td className="px-4 py-3">
                    <span className={p.lastTestOk === false ? "text-red-600" : p.lastTestOk ? "text-green-700" : "text-slate-500"}>
                      {testLabel(p.lastTestedAt, p.lastTestOk)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
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
