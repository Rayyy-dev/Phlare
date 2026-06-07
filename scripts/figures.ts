/**
 * Capture thesis figures 13–17 from the running stack as high-resolution PNGs.
 * Requires the demo data to exist (run `npm run demo` first) and the stack up
 * (web, worker, postgres, redis, mailpit).
 *
 *   npx tsx scripts/figures.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/server/db";
import { createSession } from "@/server/auth/session";
import { createCampaign } from "@/server/campaigns/service";

const APP = process.env.APP_BASE_URL ?? "http://localhost:3000";
const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";
const OUT = join(process.cwd(), "demo-output");

async function main() {
  mkdirSync(OUT, { recursive: true });

  const admin = await prisma.admin.findUniqueOrThrow({ where: { email: "demo-admin@acme-corp.example" } });
  const campaign = await prisma.campaign.findFirstOrThrow({ where: { name: { startsWith: "DEMO" }, status: "COMPLETED" }, orderBy: { createdAt: "desc" } });
  const target = await prisma.campaignTarget.findFirstOrThrow({ where: { campaignId: campaign.id, firstClickedAt: { not: null } }, select: { trackingToken: true } });

  // A fresh DRAFT campaign so Figure 17 can show the launch authorisation gate.
  await prisma.campaign.deleteMany({ where: { name: "DEMO Draft (authorisation gate)" } });
  const template = await prisma.emailTemplate.findFirstOrThrow({ where: { name: "Password Expiry Notice" } });
  const landing = await prisma.landingPage.findFirstOrThrow({ where: { name: "Generic Webmail Login" } });
  const profile = await prisma.sendingProfile.findFirstOrThrow({ where: { name: "DEMO Mailpit" } });
  const quiz = await prisma.quiz.findFirst({ where: { title: "Spot the phishing red flags" } });
  const group = await prisma.group.findFirstOrThrow({ where: { name: "DEMO All Staff" } });
  const draftId = await createCampaign(
    { name: "DEMO Draft (authorisation gate)", emailTemplateId: template.id, landingPageId: landing.id, sendingProfileId: profile.id, quizId: quiz?.id, groupIds: [group.id], scheduledAt: undefined, throttlePerMinute: 600 },
    admin.id
  );

  const token = await createSession(admin.id);
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox"] });

  const shot = async (url: string, file: string, width: number, cookie: boolean) => {
    const ctx = await browser.newContext({ viewport: { width, height: 1000 }, deviceScaleFactor: 2 });
    if (cookie) await ctx.addCookies([{ name: "phlare_session", value: token, domain: new URL(APP).hostname, path: "/", httpOnly: true, sameSite: "Lax" }]);
    const page = await ctx.newPage();
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      // Hide the Next.js dev-mode indicator so it doesn't appear in figures.
      await page.addStyleTag({ content: "nextjs-portal,#__next-build-watcher{display:none!important}" });
      await page.waitForTimeout(900);
      await page.screenshot({ path: join(OUT, file), fullPage: true });
      console.log("  ✓", file);
    } catch (e) {
      console.warn("  ✗", file, (e as Error).message);
    } finally {
      await ctx.close();
    }
  };

  try {
    await shot(`${APP}/analytics`, "fig13-analytics.png", 1280, true);
    await shot(`${APP}/campaigns/${campaign.id}/report`, "fig14-campaign-report.png", 1280, true);
    await shot(`${APP}/t/learn/${target.trackingToken}`, "fig15-teachable-moment.png", 900, false);
    await shot(`${MAILPIT}/`, "fig16-mailpit-email.png", 1280, false);
    await shot(`${APP}/campaigns/${draftId}`, "fig17-launch-authorisation-gate.png", 1280, true);
  } finally {
    await browser.close();
  }

  console.log(`\nFigures written to ${OUT}`);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((e) => { console.error("figures failed:", e); process.exit(1); });
