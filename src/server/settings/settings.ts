import { prisma } from "@/server/db";
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
