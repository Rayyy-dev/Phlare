import { headers } from "next/headers";
import { CircleCheck } from "lucide-react";
import { recordReport } from "@/server/tracking/events";

export const dynamic = "force-dynamic";

/**
 * Reporting a suspicious email is a POSITIVE signal. We always show a thank-you
 * (even for an unknown token) so the page never reveals token validity.
 */
export default async function ReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ua = (await headers()).get("user-agent");
  await recordReport(token, ua).catch(() => {});

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 text-center">
      <div className="card flex flex-col items-center">
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          <CircleCheck className="h-6 w-6" />
        </span>
        <h1 className="text-xl font-semibold text-ink-900">Thanks for reporting</h1>
        <p className="mt-2 text-sm text-ink-600">
          Reporting suspicious messages is exactly the right thing to do. This was
          an authorised internal security-awareness exercise — no action is needed.
        </p>
      </div>
    </main>
  );
}
