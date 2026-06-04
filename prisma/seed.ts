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

  // Sample recipients/groups load only on a fresh database; built-in content is
  // seeded independently (each block guards on its own table being empty).
  if ((await prisma.recipient.count()) === 0) {
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
  } else {
    console.log("[seed] recipients already present — skipping sample recipients.");
  }

  await seedBuiltInContent();
}

/**
 * A small starter library of GENERIC, NON-BRANDED training content (isBuiltin).
 * These are deliberately fictional ("Acme Corp / IT Helpdesk" style) and are
 * never imitations of real brands (Section 7.4). Each template carries a
 * difficulty, a Cialdini principle, and the red flags shown on the
 * teachable-moment page later.
 */
async function seedBuiltInContent() {
  if ((await prisma.emailTemplate.count()) === 0) {
    await prisma.emailTemplate.createMany({
      data: [
        {
          isBuiltin: true,
          name: "Password Expiry Notice",
          subject: "Action required: your password expires today",
          senderName: "IT Helpdesk",
          senderEmail: "helpdesk@acme-corp-it.example",
          difficulty: "EASY",
          principle: "AUTHORITY",
          htmlBody:
            `<p>Dear {{firstName}},</p>` +
            `<p>Our records show your {{company}} account password expires <strong>today</strong>. ` +
            `To avoid being locked out, please confirm your credentials now.</p>` +
            `<p><a href="{{trackingLink}}">Verify my account</a></p>` +
            `<p>Regards,<br/>IT Helpdesk</p>`,
          redFlags: [
            "Creates urgency by claiming the password expires today",
            "Sender domain (acme-corp-it.example) is not the real IT domain",
            "Asks you to confirm credentials via an emailed link",
            "Generic sign-off with no named contact",
          ],
        },
        {
          isBuiltin: true,
          name: "Shared Document",
          subject: "{{firstName}}, a document was shared with you",
          senderName: "Document Share",
          senderEmail: "no-reply@acme-docs.example",
          difficulty: "MEDIUM",
          principle: "CURIOSITY_FEAR",
          htmlBody:
            `<p>Hi {{firstName}},</p>` +
            `<p>A colleague has shared a confidential document with you titled ` +
            `<em>“Q3 Restructure — {{department}}”</em>.</p>` +
            `<p><a href="{{trackingLink}}">Open document</a></p>` +
            `<p>This link will expire in 24 hours.</p>`,
          redFlags: [
            "Plays on curiosity about a confidential restructure",
            "Does not name the colleague who supposedly shared it",
            "Artificial 24-hour expiry to rush you",
            "Unfamiliar sharing domain",
          ],
        },
        {
          isBuiltin: true,
          name: "Payroll Bank Details Update",
          subject: "Payroll: confirm your bank details before cut-off",
          senderName: "Payroll Team",
          senderEmail: "payroll@acme-corp-hr.example",
          difficulty: "HARD",
          principle: "URGENCY",
          htmlBody:
            `<p>Dear {{firstName}},</p>` +
            `<p>We are updating payroll records for {{company}}. To ensure your ` +
            `next salary is paid on time, confirm your bank details before the ` +
            `cut-off at 5pm today.</p>` +
            `<p><a href="{{trackingLink}}">Confirm bank details</a></p>` +
            `<p>Payroll Team</p>`,
          redFlags: [
            "Targets payment information with a same-day deadline",
            "Look-alike HR domain (acme-corp-hr.example)",
            "Requests sensitive financial details via a link",
            "Pressure to act before a cut-off time",
          ],
        },
      ],
    });
    console.log("[seed] created 3 built-in email templates.");
  }

  if ((await prisma.landingPage.count()) === 0) {
    await prisma.landingPage.createMany({
      data: [
        {
          isBuiltin: true,
          name: "Generic Webmail Login",
          difficulty: "MEDIUM",
          hasForm: true,
          htmlBody:
            `<h2>Sign in to Webmail</h2>` +
            `<p>Please sign in to continue to your mailbox.</p>`,
          // Field DEFINITIONS only — recipient input is never captured/stored.
          fieldDefs: [
            { name: "username", label: "Username", type: "text" },
            { name: "password", label: "Password", type: "password" },
          ],
        },
        {
          isBuiltin: true,
          name: "Document Portal Login",
          difficulty: "MEDIUM",
          hasForm: true,
          htmlBody:
            `<h2>Document Portal</h2>` +
            `<p>Sign in with your work email to view the shared document.</p>`,
          fieldDefs: [
            { name: "email", label: "Work email", type: "email" },
            { name: "password", label: "Password", type: "password" },
          ],
        },
      ],
    });
    console.log("[seed] created 2 built-in landing pages.");
  }

  if ((await prisma.quiz.count()) === 0) {
    await prisma.quiz.create({
      data: {
        title: "Spot the phishing red flags",
        questions: [
          {
            q: "An email urges you to act 'today' or lose access. What is this?",
            options: ["A normal reminder", "An urgency tactic used in phishing", "A system requirement"],
            correctIndex: 1,
            explanation: "Manufactured urgency pressures you to act before thinking — a classic phishing lever.",
          },
          {
            q: "The safest way to reach your account's real sign-in page is to:",
            options: ["Click the link in the email", "Type the address yourself or use a saved bookmark", "Reply asking if it's genuine"],
            correctIndex: 1,
            explanation: "Never trust the link. Navigate to the site yourself so a look-alike page can't intercept you.",
          },
          {
            q: "A sender address like helpdesk@acme-corp-it.example is suspicious because:",
            options: ["It is too long", "It mimics but does not match the real domain", "It uses lowercase letters"],
            correctIndex: 1,
            explanation: "Attackers register look-alike domains. Check the domain after the @ carefully.",
          },
        ],
      },
    });
    console.log("[seed] created 1 built-in quiz.");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
