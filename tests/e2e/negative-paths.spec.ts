import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { randomBytes } from "node:crypto";

/**
 * Negative / robustness paths (FR6, FR7, FR1):
 *  (a) garbage tracking token → graceful page, no 500 / stack trace;
 *  (b) a STOPPED campaign's tracking links do not register new events;
 *  (c) login locks the account after the configured failed-attempt threshold.
 *
 * Prisma is used only for fixture setup + assertions; the behaviour under test
 * goes through the real HTTP routes and UI.
 */
const prisma = new PrismaClient();
const LOCK_EMAIL = "e2e-lockout@acme-corp.example";
const LOCK_PASSWORD = "e2e-lockout-pw-123456";

test.afterAll(async () => {
  await prisma.campaign.deleteMany({ where: { name: { startsWith: "NEG " } } });
  await prisma.recipient.deleteMany({ where: { email: { startsWith: "neg-" } } });
  await prisma.sendingProfile.deleteMany({ where: { name: { startsWith: "NEG " } } });
  await prisma.admin.deleteMany({ where: { email: LOCK_EMAIL } });
  await prisma.$disconnect();
});

test("(a) garbage tracking token is handled gracefully (no 500)", async ({ page, request }) => {
  const bad = "not-a-real-token-" + randomBytes(8).toString("hex");

  const pixel = await request.get(`/t/o/${bad}`);
  expect(pixel.status()).toBe(200);
  expect(pixel.headers()["content-type"]).toContain("image/gif");

  const click = await page.goto(`/t/c/${bad}`);
  expect(click?.status()).toBe(200);
  await expect(page.getByText(/no longer available/i)).toBeVisible();

  const learn = await request.get(`/t/learn/${bad}`);
  expect(learn.status()).toBe(200);

  const report = await request.get(`/t/report/${bad}`);
  expect(report.status()).toBe(200);
});

test("(b) a stopped campaign does not register new tracking events", async ({ request }) => {
  const template = await prisma.emailTemplate.findFirstOrThrow({ where: { name: "Password Expiry Notice" } });
  const landing = await prisma.landingPage.findFirstOrThrow({ where: { name: "Generic Webmail Login" } });
  const admin = await prisma.admin.findFirstOrThrow();
  const profile = await prisma.sendingProfile.create({ data: { name: "NEG profile", host: "localhost", port: 1025, security: "NONE", fromName: "IT", fromEmail: "it@acme-corp.example" } });
  const recipient = await prisma.recipient.create({ data: { firstName: "Neg", lastName: "Stopped", email: `neg-${Date.now()}@acme-corp.example` } });
  const campaign = await prisma.campaign.create({
    data: { name: "NEG Stopped Campaign", status: "RUNNING", emailTemplateId: template.id, landingPageId: landing.id, sendingProfileId: profile.id, createdById: admin.id, launchedAt: new Date() },
  });
  const token = randomBytes(32).toString("base64url");
  const target = await prisma.campaignTarget.create({
    data: { campaignId: campaign.id, recipientId: recipient.id, trackingToken: token, status: "SENT", sentAt: new Date() },
  });

  // Stop the campaign, then a recipient "opens" and "clicks".
  await prisma.campaign.update({ where: { id: campaign.id }, data: { status: "STOPPED" } });
  await request.get(`/t/o/${token}`);
  await request.get(`/t/c/${token}`);

  const after = await prisma.campaignTarget.findUniqueOrThrow({ where: { id: target.id } });
  expect(after.firstOpenedAt).toBeNull();
  expect(after.firstClickedAt).toBeNull();
  const events = await prisma.event.count({ where: { campaignTargetId: target.id } });
  expect(events).toBe(0);
});

test("(c) login locks the account after repeated failed attempts", async ({ page }) => {
  await prisma.admin.deleteMany({ where: { email: LOCK_EMAIL } });
  await prisma.admin.create({
    data: { name: "Lockout Test", email: LOCK_EMAIL, passwordHash: await argon2.hash(LOCK_PASSWORD, { type: argon2.argon2id }) },
  });

  // Five wrong attempts; the threshold (5) trips the lockout.
  for (let i = 0; i < 5; i++) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(LOCK_EMAIL);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForLoadState("networkidle");
  }
  await expect(page.getByText(/temporarily locked/i)).toBeVisible();

  // Even the correct password is refused while locked.
  await page.goto("/login");
  await page.getByLabel("Email").fill(LOCK_EMAIL);
  await page.getByLabel("Password").fill(LOCK_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(/temporarily locked/i)).toBeVisible();

  const locked = await prisma.admin.findUniqueOrThrow({ where: { email: LOCK_EMAIL } });
  expect(locked.lockedUntil).not.toBeNull();
});
