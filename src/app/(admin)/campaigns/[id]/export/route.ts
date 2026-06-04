import { type NextRequest } from "next/server";
import { getCurrentAdmin } from "@/server/auth/session";
import { getCampaign } from "@/server/campaigns/service";
import { getCampaignResults } from "@/server/analytics/service";
import { toCsv } from "@/lib/csv-export";

export const dynamic = "force-dynamic";

/** CSV export of a campaign's per-recipient results (admin only). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) return new Response("Not found", { status: 404 });

  const results = await getCampaignResults(id);
  const csv = toCsv(
    ["First name", "Last name", "Email", "Department", "Status", "Opened", "Clicked", "Submitted", "Reported", "Quiz score"],
    results.map((r) => [
      r.firstName, r.lastName, r.email, r.department ?? "", r.status,
      r.opened, r.clicked, r.submitted, r.reported, r.quizScore,
    ])
  );

  const safeName = campaign.name.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="campaign-${safeName}.csv"`,
    },
  });
}
