import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";

/**
 * Audit logging of sensitive admin actions (Section 5.11 / 7.7).
 * Call this from every state-changing admin operation. Failures are swallowed —
 * an audit-write problem must never block or break the primary action, but is
 * logged to the server console for the operator.
 */
export async function recordAudit(params: {
  actorAdminId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorAdminId: params.actorAdminId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: params.details,
      },
    });
  } catch (err) {
    console.error("[audit] failed to record action", params.action, err);
  }
}
