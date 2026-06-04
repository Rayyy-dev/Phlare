import { PrismaClient } from "@prisma/client";

/**
 * Deterministic seed data (Section 8 — reproducibility).
 *
 * Phase 1 only ensures the singleton Settings row exists. Later phases extend
 * this file with the built-in template/landing-page library and a set of
 * SYNTHETIC, FICTIONAL recipients for the demo/evaluation harness — never real
 * people (Section 7.5 / 9).
 */
const prisma = new PrismaClient();

async function main() {
  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  console.log("[seed] settings ensured.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
