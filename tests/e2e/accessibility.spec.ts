import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

/**
 * Accessibility scan (NFR4) with axe-core over the key pages. Logs a per-page
 * violation summary by impact and fails on any serious/critical issue.
 */
const prisma = new PrismaClient();
const EMAIL = "e2e-axe@acme-corp.example";
const PASSWORD = "e2e-axe-pw-123456";

test.beforeAll(async () => {
  await prisma.admin.deleteMany({ where: { email: EMAIL } });
  await prisma.admin.create({ data: { name: "Axe Admin", email: EMAIL, passwordHash: await argon2.hash(PASSWORD, { type: argon2.argon2id }) } });
});
test.afterAll(async () => {
  await prisma.admin.deleteMany({ where: { email: EMAIL } });
  await prisma.$disconnect();
});

async function scan(page: import("@playwright/test").Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const byImpact: Record<string, number> = { minor: 0, moderate: 0, serious: 0, critical: 0 };
  for (const v of results.violations) byImpact[v.impact ?? "minor"] += v.nodes.length;
  console.log(`[axe] ${label}: ` + JSON.stringify(byImpact) +
    (results.violations.length ? " · " + results.violations.map((v) => `${v.id}(${v.impact})`).join(", ") : " · clean"));
  return { byImpact, violations: results.violations };
}

test("key pages have no serious/critical accessibility violations", async ({ page }) => {
  const seriousOrCritical: string[] = [];

  // Public page
  await page.goto("/login");
  let r = await scan(page, "login");
  seriousOrCritical.push(...r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `login:${v.id}`));

  // Authenticate
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  for (const [path, label] of [["/dashboard", "dashboard"], ["/recipients", "recipients"], ["/templates/new", "template-editor"], ["/analytics", "analytics"]] as const) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    r = await scan(page, label);
    seriousOrCritical.push(...r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${label}:${v.id}`));
  }

  expect(seriousOrCritical, `serious/critical violations: ${seriousOrCritical.join(", ")}`).toEqual([]);
});
