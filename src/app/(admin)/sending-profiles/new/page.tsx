import { BackLink } from "@/components/BackLink";
import { requireAdmin } from "@/server/auth/guard";
import { SendingProfileForm } from "../SendingProfileForm";

export const dynamic = "force-dynamic";

export default async function NewSendingProfilePage() {
  await requireAdmin();
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <BackLink href="/sending-profiles" label="Sending profiles" />
        <h1 className="mt-1 text-2xl font-bold tracking-tight">New sending profile</h1>
      </div>
      <div className="card">
        <SendingProfileForm mode="create" />
      </div>
    </div>
  );
}
