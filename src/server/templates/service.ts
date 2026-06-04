import { prisma } from "@/server/db";
import { recordAudit } from "@/server/audit/log";
import { sanitizeHtml } from "@/server/html/sanitize";
import { emailTemplateSchema, type EmailTemplateInput } from "@/lib/validation";
import type { EmailTemplate } from "@prisma/client";

export function listTemplates() {
  return prisma.emailTemplate.findMany({
    where: { deletedAt: null },
    orderBy: [{ isBuiltin: "desc" }, { name: "asc" }],
  });
}

export function getTemplate(id: string) {
  return prisma.emailTemplate.findFirst({ where: { id, deletedAt: null } });
}

/** Shape the validated input into a row, sanitising the HTML body before store. */
function toData(input: EmailTemplateInput) {
  const data = emailTemplateSchema.parse(input);
  return {
    name: data.name,
    subject: data.subject,
    senderName: data.senderName,
    senderEmail: data.senderEmail,
    htmlBody: sanitizeHtml(data.htmlBody),
    textBody: data.textBody ?? null,
    difficulty: data.difficulty,
    principle: data.principle,
    redFlags: data.redFlags,
  };
}

export async function createTemplate(
  input: EmailTemplateInput,
  actorId: string
): Promise<EmailTemplate> {
  const template = await prisma.emailTemplate.create({ data: toData(input) });
  await recordAudit({
    actorAdminId: actorId,
    action: "template.created",
    entityType: "EmailTemplate",
    entityId: template.id,
    details: { name: template.name },
  });
  return template;
}

export async function updateTemplate(
  id: string,
  input: EmailTemplateInput,
  actorId: string
): Promise<EmailTemplate> {
  const template = await prisma.emailTemplate.update({ where: { id }, data: toData(input) });
  await recordAudit({
    actorAdminId: actorId,
    action: "template.updated",
    entityType: "EmailTemplate",
    entityId: id,
  });
  return template;
}

export async function softDeleteTemplate(id: string, actorId: string): Promise<void> {
  await prisma.emailTemplate.update({ where: { id }, data: { deletedAt: new Date() } });
  await recordAudit({
    actorAdminId: actorId,
    action: "template.deleted",
    entityType: "EmailTemplate",
    entityId: id,
  });
}
