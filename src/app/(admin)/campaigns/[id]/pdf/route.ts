import { type NextRequest } from "next/server";
import { getCurrentAdmin, SESSION_COOKIE } from "@/server/auth/session";
import { getCampaign } from "@/server/campaigns/service";
import { getSettings } from "@/server/settings/settings";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Renders the print-friendly campaign report to PDF with Playwright/Chromium,
 * reusing the real styled page (charts and all). We forward the admin's session
 * cookie to the headless browser so the guarded `/print/...` route renders
 * authenticated. Admin only.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) return new Response("Not found", { status: 404 });

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const settings = await getSettings();
  const base = settings.baseUrl.replace(/\/$/, "");
  const printUrl = `${base}/print/campaign/${id}`;
  const host = new URL(base).hostname;

  // Dynamic import keeps Playwright out of the bundle and off the hot path.
  const { chromium } = await import("playwright");
  let browser;
  try {
    browser = await chromium.launch({ args: ["--no-sandbox"] });
    const context = await browser.newContext();
    if (token) {
      await context.addCookies([
        { name: SESSION_COOKIE, value: token, domain: host, path: "/", httpOnly: true, sameSite: "Lax" },
      ]);
    }
    const page = await context.newPage();
    await page.goto(printUrl, { waitUntil: "networkidle", timeout: 30000 });
    // Give Recharts a moment to draw before snapshotting.
    await page.waitForTimeout(600);
    const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" } });

    const safeName = campaign.name.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="campaign-${safeName}.pdf"`,
      },
    });
  } catch (err) {
    console.error("[pdf] generation failed", err);
    return new Response(
      "PDF generation failed. Ensure Chromium is installed (`npx playwright install chromium`).",
      { status: 500 }
    );
  } finally {
    await browser?.close();
  }
}
