/**
 * Mini load test (NFR5). Seeds ~2,000 synthetic recipients and ~20,000 tracking
 * events, then measures p50/p95/max response time for the analytics dashboard
 * and the recipients list over a ~30s timed loop. Reports a bounded claim, not a
 * benchmark suite. Cleans up its own data afterwards.
 *
 *   npm run loadtest      (stack must be running)
 */
import { prisma } from "@/server/db";
import { createSession } from "@/server/auth/session";
import { generateTrackingToken } from "@/server/tracking/token";

const APP = process.env.APP_BASE_URL ?? "http://localhost:3000";
const N_RECIPIENTS = 2000;
const N_EVENTS = 20000;
const DURATION_MS = 30000;
const DEPTS = ["Finance", "IT", "Sales", "HR", "Operations"];
const TYPES = ["SENT", "OPENED", "CLICKED", "SUBMITTED", "REPORTED"] as const;

const pct = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

async function seed() {
  console.log(`[load] seeding ${N_RECIPIENTS} recipients + ${N_EVENTS} events…`);
  await cleanup();
  const admin = await prisma.admin.create({ data: { name: "Load", email: "load@acme-corp.example", passwordHash: "x" } });
  const template = await prisma.emailTemplate.findFirstOrThrow();
  const landing = await prisma.landingPage.findFirstOrThrow();
  const profile = await prisma.sendingProfile.create({ data: { name: "LOAD profile", host: "localhost", port: 1025, security: "NONE", fromName: "IT", fromEmail: "it@x.example" } });

  await prisma.recipient.createMany({
    data: Array.from({ length: N_RECIPIENTS }, (_, i) => ({
      firstName: `Load${i}`, lastName: "Test", email: `load-${i}@acme-corp.example`, department: DEPTS[i % DEPTS.length],
    })),
  });
  const recipients = await prisma.recipient.findMany({ where: { email: { startsWith: "load-" } }, select: { id: true } });
  const campaign = await prisma.campaign.create({ data: { name: "LOAD Campaign", status: "COMPLETED", emailTemplateId: template.id, landingPageId: landing.id, sendingProfileId: profile.id, createdById: admin.id, launchedAt: new Date() } });

  // One SENT target per recipient, with a spread of first-event markers.
  await prisma.campaignTarget.createMany({
    data: recipients.map((r, i) => ({
      campaignId: campaign.id, recipientId: r.id, trackingToken: generateTrackingToken(), status: "SENT", sentAt: new Date(),
      firstOpenedAt: i % 2 === 0 ? new Date() : null,
      firstClickedAt: i % 3 === 0 ? new Date() : null,
      firstSubmittedAt: i % 5 === 0 ? new Date() : null,
      reportedAt: i % 7 === 0 ? new Date() : null,
    })),
  });
  const targets = await prisma.campaignTarget.findMany({ where: { campaignId: campaign.id }, select: { id: true } });

  // ~20,000 events spread across targets, in batches.
  const events = Array.from({ length: N_EVENTS }, (_, i) => ({
    campaignTargetId: targets[i % targets.length].id,
    type: TYPES[i % TYPES.length],
    occurredAt: new Date(Date.now() - (i % 1440) * 60000),
  }));
  for (let i = 0; i < events.length; i += 5000) await prisma.event.createMany({ data: events.slice(i, i + 5000) });

  return admin;
}

async function cleanup() {
  await prisma.campaign.deleteMany({ where: { name: "LOAD Campaign" } });
  await prisma.recipient.deleteMany({ where: { email: { startsWith: "load-" } } });
  await prisma.sendingProfile.deleteMany({ where: { name: "LOAD profile" } });
  await prisma.admin.deleteMany({ where: { email: "load@acme-corp.example" } });
}

async function measure(label: string, url: string, cookie: string) {
  await fetch(url, { headers: { Cookie: cookie } }); // warm-up (compile/route)
  const latencies: number[] = [];
  const end = Date.now() + DURATION_MS;
  while (Date.now() < end) {
    const t = performance.now();
    const res = await fetch(url, { headers: { Cookie: cookie } });
    await res.text();
    latencies.push(performance.now() - t);
  }
  latencies.sort((a, b) => a - b);
  const r = (n: number) => Math.round(n);
  console.log(`[load] ${label}: n=${latencies.length}  p50=${r(pct(latencies, 50))}ms  p95=${r(pct(latencies, 95))}ms  max=${r(Math.max(...latencies))}ms`);
}

async function main() {
  const admin = await seed();
  const token = await createSession(admin.id);
  const cookie = `phlare_session=${token}`;
  const total = await prisma.recipient.count({ where: { deletedAt: null } });
  const events = await prisma.event.count();
  console.log(`[load] dataset: ${total} active recipients, ${events} events. Measuring for ${DURATION_MS / 1000}s each…`);

  await measure("analytics dashboard /analytics", `${APP}/analytics`, cookie);
  await measure("recipients list   /recipients", `${APP}/recipients`, cookie);

  await cleanup();
  console.log("[load] done, data cleaned up.");
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
