import { prisma } from "@/server/db";
import { recordAudit } from "@/server/audit/log";
import { sanitizeHtml } from "@/server/html/sanitize";
import { landingPageSchema, type LandingPageInput } from "@/lib/validation";
import type { LandingPage, Prisma } from "@prisma/client";

export function listLandingPages() {
  return prisma.landingPage.findMany({
    where: { deletedAt: null },
    orderBy: [{ isBuiltin: "desc" }, { name: "asc" }],
  });
}

export function getLandingPage(id: string) {
  return prisma.landingPage.findFirst({ where: { id, deletedAt: null } });
}

function toData(input: LandingPageInput) {
  const data = landingPageSchema.parse(input);
  return {
    name: data.name,
    htmlBody: sanitizeHtml(data.htmlBody),
    hasForm: data.hasForm,
    // Only field DEFINITIONS are stored ({ name, label, type }). A recipient's
    // actual input is never captured or persisted (Section 7.1).
    fieldDefs: (data.hasForm ? data.fieldDefs : []) as unknown as Prisma.InputJsonValue,
    difficulty: data.difficulty,
  };
}

export async function createLandingPage(
  input: LandingPageInput,
  actorId: string
): Promise<LandingPage> {
  const page = await prisma.landingPage.create({ data: toData(input) });
  await recordAudit({
    actorAdminId: actorId,
    action: "landing_page.created",
    entityType: "LandingPage",
    entityId: page.id,
    details: { name: page.name },
  });
  return page;
}

export async function updateLandingPage(
  id: string,
  input: LandingPageInput,
  actorId: string
): Promise<LandingPage> {
  const page = await prisma.landingPage.update({ where: { id }, data: toData(input) });
  await recordAudit({
    actorAdminId: actorId,
    action: "landing_page.updated",
    entityType: "LandingPage",
    entityId: id,
  });
  return page;
}

export async function softDeleteLandingPage(id: string, actorId: string): Promise<void> {
  await prisma.landingPage.update({ where: { id }, data: { deletedAt: new Date() } });
  await recordAudit({
    actorAdminId: actorId,
    action: "landing_page.deleted",
    entityType: "LandingPage",
    entityId: id,
  });
}
