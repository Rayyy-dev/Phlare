import { PrismaClient } from "@prisma/client";

/**
 * Deterministic seed data (Section 8 — reproducibility).
 *
 * Ensures the singleton Settings row exists and, on a fresh database, loads a
 * small set of SYNTHETIC, FICTIONAL recipients and two groups so the UI and the
 * demo are repeatable. These are invented people at the fictional "Acme Corp" —
 * never real individuals (Section 7.5 / 9). The seed is idempotent: it skips the
 * sample data if any recipients already exist.
 */
const prisma = new PrismaClient();

const SAMPLE_RECIPIENTS = [
  { firstName: "Alice", lastName: "Nowak", email: "alice.nowak@acme-corp.example", department: "Finance", position: "Accountant" },
  { firstName: "Bartek", lastName: "Kowalski", email: "bartek.kowalski@acme-corp.example", department: "Finance", position: "Controller" },
  { firstName: "Chloe", lastName: "Adams", email: "chloe.adams@acme-corp.example", department: "Sales", position: "Account Executive" },
  { firstName: "David", lastName: "Lewandowski", email: "david.lewandowski@acme-corp.example", department: "Sales", position: "Sales Manager" },
  { firstName: "Ewa", lastName: "Zielinska", email: "ewa.zielinska@acme-corp.example", department: "IT", position: "Systems Administrator" },
  { firstName: "Frank", lastName: "Bauer", email: "frank.bauer@acme-corp.example", department: "IT", position: "Help Desk Technician" },
  { firstName: "Grace", lastName: "Hughes", email: "grace.hughes@acme-corp.example", department: "HR", position: "HR Specialist" },
  { firstName: "Hugo", lastName: "Martin", email: "hugo.martin@acme-corp.example", department: "Operations", position: "Operations Lead" },
];

async function main() {
  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  if ((await prisma.recipient.count()) > 0) {
    console.log("[seed] recipients already present — skipping sample data.");
    return;
  }

  await prisma.recipient.createMany({ data: SAMPLE_RECIPIENTS });
  const recipients = await prisma.recipient.findMany();
  const byDept = (dept: string) => recipients.filter((r) => r.department === dept);

  const finance = await prisma.group.create({
    data: { name: "Finance Team", description: "Finance department staff." },
  });
  const itDept = await prisma.group.create({
    data: { name: "IT Department", description: "IT and help-desk staff." },
  });

  await prisma.groupMember.createMany({
    data: [
      ...byDept("Finance").map((r) => ({ groupId: finance.id, recipientId: r.id })),
      ...byDept("IT").map((r) => ({ groupId: itDept.id, recipientId: r.id })),
    ],
  });

  console.log(`[seed] created ${SAMPLE_RECIPIENTS.length} sample recipients and 2 groups.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
