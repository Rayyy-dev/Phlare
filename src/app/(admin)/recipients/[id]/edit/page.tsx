import { BackLink } from "@/components/BackLink";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/guard";
import { prisma } from "@/server/db";
import { RecipientForm } from "../../RecipientForm";

export const dynamic = "force-dynamic";

export default async function EditRecipientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const recipient = await prisma.recipient.findFirst({
    where: { id, deletedAt: null },
  });
  if (!recipient) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <BackLink href="/recipients" label="Recipients" />
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">Edit recipient</h1>
      </div>
      <div className="card">
        <RecipientForm mode="edit" recipient={recipient} />
      </div>
    </div>
  );
}
