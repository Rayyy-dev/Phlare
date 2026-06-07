import { BackLink } from "@/components/BackLink";
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
        <BackLink href="/sending-profiles" label="Sending profiles" />
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">Edit sending profile</h1>
      </div>
      <div className="card">
        <SendingProfileForm mode="edit" profile={profile} />
      </div>
      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-ink-600">Test this profile</h2>
        <TestEmailControl profileId={profile.id} />
      </div>
    </div>
  );
}
