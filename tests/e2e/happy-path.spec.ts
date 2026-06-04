import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

/**
 * End-to-end happy path: log in → create a sending profile → create and launch a
 * campaign against seeded recipients → (worker delivers) → simulate
 * open/click/submit via the public tracking routes → land on the teachable
 * moment → confirm the events surface in the campaign analytics report.
 *
 * Uses Prisma directly only for fixture setup (a known-password admin) and to
 * read the unguessable tracking token + wait for delivery — everything else
 * goes through the real UI and HTTP routes. Requires the worker + Mailpit up.
 */
const prisma = new PrismaClient();
const EMAIL = "e2e-admin@acme-corp.example";
const PASSWORD = "e2e-password-12345";

test.beforeAll(async () => {
  await prisma.admin.deleteMany({ where: { email: EMAIL } });
  await prisma.admin.create({
    data: { name: "E2E Admin", email: EMAIL, passwordHash: await argon2.hash(PASSWORD, { type: argon2.argon2id }) },
  });
  // Ensure the seeded content + a target group exist (idempotent seed).
  if (!(await prisma.group.findFirst({ where: { name: "Finance Team" } }))) {
    throw new Error("Run `npm run db:seed` first — Finance Team group is required.");
  }
});

test.afterAll(async () => {
  await prisma.campaign.deleteMany({ where: { name: { startsWith: "E2E " } } });
  await prisma.sendingProfile.deleteMany({ where: { name: { startsWith: "E2E " } } });
  await prisma.$disconnect();
});

test("admin can run a campaign and see tracked events in analytics", async ({ page, request }) => {
  // 1. Log in
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // 2. Create a Mailpit sending profile
  await page.goto("/sending-profiles/new");
  await page.getByLabel("Profile name").fill("E2E Mailpit");
  await page.getByLabel("SMTP host").fill("localhost");
  await page.getByLabel("Port").fill("1025");
  await page.getByLabel("From name").fill("IT Helpdesk");
  await page.getByLabel("From email").fill("helpdesk@acme-corp.example");
  await page.getByRole("button", { name: "Create profile" }).click();
  await expect(page).toHaveURL(/\/sending-profiles\/.+\/edit/);

  // 3. Create a campaign (seeded template + landing + the Finance Team group)
  await page.goto("/campaigns/new");
  await page.getByLabel("Campaign name").fill("E2E Happy Path");
  await page.getByLabel("Email template").selectOption({ label: "Password Expiry Notice" });
  await page.getByLabel("Landing page").selectOption({ label: "Generic Webmail Login" });
  await page.getByLabel("Sending profile").selectOption({ label: "E2E Mailpit" });
  await page.getByLabel("Send rate (per minute)").fill("600");
  await page.getByRole("checkbox", { name: /Finance Team/ }).check();
  await page.getByRole("button", { name: "Create draft" }).click();
  // Wait for the campaign DETAIL page (cuid), not the /new form.
  await page.waitForURL(/\/campaigns\/c\w+$/);
  await expect(page.getByText("Configuration")).toBeVisible();

  const campaignId = page.url().split("/campaigns/")[1].split(/[/?]/)[0];

  // 4. Launch (authorisation gate)
  await page.getByRole("checkbox", { name: /I confirm I am/ }).check();
  await page.getByRole("button", { name: /Launch campaign/ }).click();
  await expect(page.getByText(/RUNNING|COMPLETED/)).toBeVisible({ timeout: 15_000 });

  // 5. Wait for the worker to deliver, then read one unguessable token
  let token = "";
  for (let i = 0; i < 30; i++) {
    const t = await prisma.campaignTarget.findFirst({ where: { campaignId, status: "SENT" }, select: { trackingToken: true } });
    if (t) { token = t.trackingToken; break; }
    await page.waitForTimeout(700);
  }
  expect(token).not.toBe("");

  // 6. Simulate open + click + submit through the public tracking routes
  await request.get(`/t/o/${token}`);
  await page.goto(`/t/c/${token}`);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await page.getByRole("button", { name: "Sign in" }).click();
  // 7. Teachable-moment page (never a dead end)
  await expect(page.getByText(/authorised internal security-awareness exercise/i)).toBeVisible();

  // 8. The events surface in the campaign report
  await page.goto(`/campaigns/${campaignId}/report`);
  await expect(page.getByText("Engagement rates")).toBeVisible();
  const clicked = await prisma.campaignTarget.count({ where: { campaignId, firstClickedAt: { not: null } } });
  const submitted = await prisma.campaignTarget.count({ where: { campaignId, firstSubmittedAt: { not: null } } });
  expect(clicked).toBeGreaterThanOrEqual(1);
  expect(submitted).toBeGreaterThanOrEqual(1);
});
