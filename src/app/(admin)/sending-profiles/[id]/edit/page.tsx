import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/guard";
import { getProfileView } from "@/server/sending-profiles/service";
import { SendingProfileForm } from "../../SendingProfileForm";
import { TestEmailControl } from "../../TestEmailControl";

export const dynamic = "force-dynamic";

export default async function EditSendingProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const profile = await getProfileView(id);
  if (!profile) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/sending-profiles" className="text-sm text-slate-500 hover:text-slate-700">← Sending profiles</Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Edit sending profile</h1>
      </div>
      <div className="card">
        <SendingProfileForm mode="edit" profile={profile} />
      </div>
      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-600">Test this profile</h2>
        <TestEmailControl profileId={profile.id} />
      </div>
    </div>
  );
}
