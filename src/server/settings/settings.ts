import { prisma } from "@/server/db";
import { recordAudit } from "@/server/audit/log";
import { settingsSchema, type SettingsInput } from "@/lib/validation";
import type { Settings } from "@prisma/client";

/**
 * Settings is a singleton row keyed by the literal id "singleton". This helper
 * guarantees the row exists, so callers never deal with a missing record.
 */
export async function getSettings(): Promise<Settings> {
  return prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

export async function isSetupComplete(): Promise<boolean> {
  const adminCount = await prisma.admin.count();
  return adminCount > 0;
}

export async function updateSettings(input: SettingsInput, actorId: string): Promise<void> {
  const data = settingsSchema.parse(input);
  await prisma.settings.update({
    where: { id: "singleton" },
    data: {
      orgName: data.orgName,
      baseUrl: data.baseUrl,
      defaultThrottlePerMinute: data.defaultThrottlePerMinute,
      retentionDays: data.retentionDays,
      reportEmail: data.reportEmail ?? null,
    },
  });
  await recordAudit({ actorAdminId: actorId, action: "settings.updated", entityType: "Settings" });
}

/** Recent audit-log entries with the acting admin's name, for the settings page. */
export function listAuditLog(limit = 50) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { actor: { select: { name: true, email: true } } },
  });
}
