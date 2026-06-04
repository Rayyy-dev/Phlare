/**
 * Phlare demo / evaluation harness (Phase 7, feeds Chapter 5).
 *
 * Runs a complete, REPRODUCIBLE phishing-simulation campaign end to end against
 * SYNTHETIC, FICTIONAL recipients only — never real people — and writes the
 * artefacts a thesis evaluation needs:
 *   demo-output/metrics.json          campaign + org metrics
 *   demo-output/campaign-report.pdf   the PDF report (Playwright)
 *   demo-output/analytics.png         screenshot of the org dashboard
 *   demo-output/campaign-report.png   screenshot of the per-campaign report
 *
 * Deterministic: a fixed recipient list and a fixed (index-based) interaction
 * pattern, so re-running produces the same figures. Requires the stack running
 * (web on APP_BASE_URL, worker, postgres, redis, mailpit).
 *
 *   npm run demo
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import { createProfile } from "@/server/sending-profiles/service";
import { createCampaign, launchCampaign } from "@/server/campaigns/service";
import { recordOpen, recordClick, recordSubmit, recordReport } from "@/server/tracking/events";
import { gradeAndStore } from "@/server/quizzes/service";
import { refreshAllRiskScores } from "@/server/risk/service";
import { getCampaignMetrics, getOrgMetrics, getCampaignResults } from "@/server/analytics/service";

const APP = process.env.APP_BASE_URL ?? "http://localhost:3000";
const OUT = join(process.cwd(), "demo-output");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Synthetic, clearly-fictional people at the fictional "Acme Corp".
const DEMO_RECIPIENTS = [
  ["Ada", "Demo", "Finance"], ["Ben", "Demo", "Finance"], ["Cara", "Demo", "Finance"],
  ["Dan", "Demo", "IT"], ["Eve", "Demo", "IT"], ["Finn", "Demo", "IT"],
  ["Gia", "Demo", "Sales"], ["Hugo", "Demo", "Sales"], ["Ivy", "Demo", "Sales"],
  ["Jo", "Demo", "HR"], ["Kit", "Demo", "HR"], ["Lee", "Demo", "Operations"],
].map(([first, last, dept], i) => ({
  firstName: first, lastName: last, department: dept,
  email: `demo-${String(i).padStart(2, "0")}-${first.toLowerCase()}@acme-corp.example`,
}));

async function cleanPrevious() {
  await prisma.campaign.deleteMany({ where: { name: { startsWith: "DEMO" } } });
  await prisma.recipient.deleteMany({ where: { email: { startsWith: "demo-" } } });
  await prisma.group.deleteMany({ where: { name: { startsWith: "DEMO" } } });
  await prisma.sendingProfile.deleteMany({ where: { name: { startsWith: "DEMO" } } });
  const a = await prisma.admin.findUnique({ where: { email: "demo-admin@acme-corp.example" } });
  if (a) { await prisma.session.deleteMany({ where: { adminId: a.id } }); await prisma.auditLog.deleteMany({ where: { actorAdminId: a.id } }); await prisma.admin.delete({ where: { id: a.id } }); }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log("[demo] preparing deterministic synthetic data…");
  await prisma.settings.update({ where: { id: "singleton" }, data: { baseUrl: APP } });
  await cleanPrevious();

  const admin = await prisma.admin.create({
    data: { name: "Demo Admin", email: "demo-admin@acme-corp.example", passwordHash: await hashPassword("demo-password-1234") },
  });
  const template = await prisma.emailTemplate.findFirstOrThrow({ where: { name: "Password Expiry Notice" } });
  const landing = await prisma.landingPage.findFirstOrThrow({ where: { name: "Generic Webmail Login" } });
  const quiz = await prisma.quiz.findFirst({ where: { title: "Spot the phishing red flags" } });
  const profileId = await createProfile(
    { name: "DEMO Mailpit", host: process.env.MAILPIT_SMTP_HOST ?? "localhost", port: Number(process.env.MAILPIT_SMTP_PORT ?? 1025), security: "NONE", fromName: "IT Helpdesk", fromEmail: "helpdesk@acme-corp.example", username: undefined, password: undefined },
    admin.id
  );

  await prisma.recipient.createMany({ data: DEMO_RECIPIENTS });
  const recipients = await prisma.recipient.findMany({ where: { email: { startsWith: "demo-" } }, orderBy: { email: "asc" } });
  const group = await prisma.group.create({ data: { name: "DEMO All Staff" } });
  await prisma.groupMember.createMany({ data: recipients.map((r) => ({ groupId: group.id, recipientId: r.id })) });

  console.log("[demo] launching campaign…");
  const campaignId = await createCampaign(
    { name: "DEMO Q3 Awareness Test", emailTemplateId: template.id, landingPageId: landing.id, sendingProfileId: profileId, quizId: quiz?.id, groupIds: [group.id], scheduledAt: undefined, throttlePerMinute: 600 },
    admin.id
  );
  await launchCampaign(campaignId, admin.id, true);
  for (let i = 0; i < 30; i++) {
    if ((await prisma.campaignTarget.count({ where: { campaignId, status: "SENT" } })) >= recipients.length) break;
    await sleep(700);
  }

  console.log("[demo] simulating a deterministic interaction pattern…");
  const targets = await prisma.campaignTarget.findMany({ where: { campaignId }, include: { recipient: true }, orderBy: { recipient: { email: "asc" } } });
  for (let i = 0; i < targets.length; i++) {
    const tok = targets[i].trackingToken;
    if (i % 5 !== 4) await recordOpen(tok);          // most open
    if (i % 2 === 0) await recordClick(tok);          // half click
    if (i % 3 === 0) await recordSubmit(tok, ["username", "password"]); // a third submit
    if (i % 5 === 4) await recordReport(tok);         // some report (good)
    if (quiz && i % 4 === 0) await gradeAndStore(tok, [1, 1, 1]); // some complete the quiz
  }
  await refreshAllRiskScores();
  await sleep(300);

  // ── Metrics ────────────────────────────────────────────────────────────────
  const [campaignMetrics, org, results] = await Promise.all([
    getCampaignMetrics(campaignId), getOrgMetrics(), getCampaignResults(campaignId),
  ]);
  writeFileSync(join(OUT, "metrics.json"), JSON.stringify({ campaign: campaignMetrics, organisation: org.metrics, recipients: results.length }, null, 2));
  console.log("[demo] campaign metrics:", campaignMetrics);

  // ── PDF + screenshots (authenticated via a real session cookie) ─────────────
  const token = await createSession(admin.id);
  const cookieHeader = `phlare_session=${token}`;

  console.log("[demo] generating PDF report…");
  const pdfRes = await fetch(`${APP}/campaigns/${campaignId}/pdf`, { headers: { Cookie: cookieHeader } });
  if (pdfRes.ok) writeFileSync(join(OUT, "campaign-report.pdf"), Buffer.from(await pdfRes.arrayBuffer()));
  else console.warn("[demo] PDF generation failed:", pdfRes.status);

  console.log("[demo] capturing screenshots…");
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1400 } });
    await ctx.addCookies([{ name: "phlare_session", value: token, domain: new URL(APP).hostname, path: "/", httpOnly: true, sameSite: "Lax" }]);
    const page = await ctx.newPage();
    await page.goto(`${APP}/analytics`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(OUT, "analytics.png"), fullPage: true });
    await page.goto(`${APP}/campaigns/${campaignId}/report`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(OUT, "campaign-report.png"), fullPage: true });
  } finally {
    await browser.close();
  }

  console.log(`\n[demo] done. Artefacts written to ${OUT}:`);
  console.log("  metrics.json · campaign-report.pdf · analytics.png · campaign-report.png");
  console.log(`[demo] Campaign phish-prone: ${campaignMetrics.phishProne}% (delivered ${campaignMetrics.delivered}, clicked ${campaignMetrics.clicked}, submitted ${campaignMetrics.submitted}, reported ${campaignMetrics.reported}).`);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((e) => { console.error("[demo] failed:", e); process.exit(1); });
