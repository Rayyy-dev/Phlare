import { prisma } from "@/server/db";
import { recordAudit } from "@/server/audit/log";
import { recipientSchema, type RecipientInput } from "@/lib/validation";
import { parseCsv } from "@/lib/csv";
import type { RecipientField } from "@/lib/validation";
import type { Prisma, Recipient } from "@prisma/client";

export const RECIPIENTS_PAGE_SIZE = 20;

/** Raised when an email already belongs to an *active* recipient. */
export class DuplicateRecipientError extends Error {
  constructor(public existingId: string) {
    super("A recipient with this email already exists.");
  }
}

/**
 * Raised when an email matches a *soft-deleted* recipient. The caller should
 * offer reactivation rather than treating this as a hard error — this is how we
 * resolve the "unique among non-deleted" limitation in the application layer
 * (Postgres can't express a partial unique on a plain column). See DECISIONS.md.
 */
export class SoftDeletedRecipientError extends Error {
  constructor(public existingId: string) {
    super("A deleted recipient with this email exists; reactivate instead.");
  }
}

export interface RecipientListParams {
  page?: number;
  query?: string;
  department?: string;
  groupId?: string;
}

export async function listRecipients(params: RecipientListParams) {
  const page = Math.max(1, params.page ?? 1);

  const where: Prisma.RecipientWhereInput = { deletedAt: null };
  if (params.query) {
    where.OR = [
      { firstName: { contains: params.query, mode: "insensitive" } },
      { lastName: { contains: params.query, mode: "insensitive" } },
      { email: { contains: params.query, mode: "insensitive" } },
    ];
  }
  if (params.department) where.department = params.department;
  if (params.groupId) where.memberships = { some: { groupId: params.groupId } };

  const [items, total] = await Promise.all([
    prisma.recipient.findMany({
      where,
      include: { memberships: { include: { group: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * RECIPIENTS_PAGE_SIZE,
      take: RECIPIENTS_PAGE_SIZE,
    }),
    prisma.recipient.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / RECIPIENTS_PAGE_SIZE)),
  };
}

/** Distinct, non-empty departments across active recipients (for the filter). */
export async function listDepartments(): Promise<string[]> {
  const rows = await prisma.recipient.findMany({
    where: { deletedAt: null, department: { not: null } },
    distinct: ["department"],
    select: { department: true },
    orderBy: { department: "asc" },
  });
  return rows.map((r) => r.department!).filter(Boolean);
}

/** Look up any recipient (including soft-deleted) by email. */
function findByEmail(email: string) {
  return prisma.recipient.findUnique({ where: { email } });
}

export async function createRecipient(
  input: RecipientInput,
  actorId: string
): Promise<Recipient> {
  const data = recipientSchema.parse(input);

  const existing = await findByEmail(data.email);
  if (existing) {
    if (existing.deletedAt) throw new SoftDeletedRecipientError(existing.id);
    throw new DuplicateRecipientError(existing.id);
  }

  const recipient = await prisma.recipient.create({ data });
  await recordAudit({
    actorAdminId: actorId,
    action: "recipient.created",
    entityType: "Recipient",
    entityId: recipient.id,
    details: { email: recipient.email },
  });
  return recipient;
}

/** Clear `deletedAt` on a soft-deleted recipient and overwrite its fields. */
export async function reactivateRecipient(
  id: string,
  input: RecipientInput,
  actorId: string
): Promise<Recipient> {
  const data = recipientSchema.parse(input);
  const recipient = await prisma.recipient.update({
    where: { id },
    data: { ...data, deletedAt: null },
  });
  await recordAudit({
    actorAdminId: actorId,
    action: "recipient.reactivated",
    entityType: "Recipient",
    entityId: id,
    details: { email: recipient.email },
  });
  return recipient;
}

export async function updateRecipient(
  id: string,
  input: RecipientInput,
  actorId: string
): Promise<Recipient> {
  const data = recipientSchema.parse(input);

  // Reject any other recipient holding this email — including a soft-deleted one,
  // since the unique constraint spans deleted rows and would otherwise throw.
  const clash = await prisma.recipient.findFirst({
    where: { email: data.email, id: { not: id } },
  });
  if (clash) throw new DuplicateRecipientError(clash.id);

  const recipient = await prisma.recipient.update({ where: { id }, data });
  await recordAudit({
    actorAdminId: actorId,
    action: "recipient.updated",
    entityType: "Recipient",
    entityId: id,
  });
  return recipient;
}

export async function softDeleteRecipient(
  id: string,
  actorId: string
): Promise<void> {
  await prisma.recipient.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await recordAudit({
    actorAdminId: actorId,
    action: "recipient.deleted",
    entityType: "Recipient",
    entityId: id,
  });
}

// ── CSV import ───────────────────────────────────────────────────────────────

export interface ImportOptions {
  /** Maps each recipient field to a CSV header name (or "" if unmapped). */
  mapping: Record<RecipientField, string>;
  /** Update fields of an existing active recipient instead of skipping it. */
  updateExisting: boolean;
  /** Optionally add every imported recipient to this group. */
  groupId?: string;
}

export interface ImportRowError {
  row: number; // 1-based data row (excludes the header)
  email?: string;
  reason: string;
}

export interface ImportReport {
  total: number;
  created: number;
  updated: number;
  reactivated: number;
  skipped: number;
  failed: ImportRowError[];
}

/**
 * Import recipients from raw CSV text. Idempotent on email and resilient: a bad
 * row is reported, never fatal. Existing active recipients are skipped (or
 * updated when requested); soft-deleted matches are reactivated.
 */
export async function importRecipientsFromCsv(
  csvText: string,
  options: ImportOptions,
  actorId: string
): Promise<ImportReport> {
  const { headers, rows } = parseCsv(csvText);

  // Resolve each mapped field to a column index up front.
  const columnIndex = {} as Record<RecipientField, number>;
  for (const field of Object.keys(options.mapping) as RecipientField[]) {
    const header = options.mapping[field];
    columnIndex[field] = header ? headers.indexOf(header) : -1;
  }

  const report: ImportReport = {
    total: rows.length,
    created: 0,
    updated: 0,
    reactivated: 0,
    skipped: 0,
    failed: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;
    const cell = (field: RecipientField) => {
      const idx = columnIndex[field];
      return idx >= 0 ? (row[idx] ?? "").trim() : "";
    };

    const parsed = recipientSchema.safeParse({
      firstName: cell("firstName"),
      lastName: cell("lastName"),
      email: cell("email"),
      department: cell("department"),
      position: cell("position"),
    });

    if (!parsed.success) {
      report.failed.push({
        row: rowNumber,
        email: cell("email") || undefined,
        reason: parsed.error.issues[0]?.message ?? "Invalid row.",
      });
      continue;
    }

    try {
      const recipientId = await upsertImportedRecipient(parsed.data, options, report);
      if (recipientId && options.groupId) {
        await prisma.groupMember.createMany({
          data: [{ groupId: options.groupId, recipientId }],
          skipDuplicates: true,
        });
      }
    } catch {
      report.failed.push({
        row: rowNumber,
        email: parsed.data.email,
        reason: "Could not be saved.",
      });
    }
  }

  await recordAudit({
    actorAdminId: actorId,
    action: "recipients.imported",
    entityType: "Recipient",
    details: {
      total: report.total,
      created: report.created,
      updated: report.updated,
      reactivated: report.reactivated,
      skipped: report.skipped,
      failed: report.failed.length,
      groupId: options.groupId,
    },
  });

  return report;
}

/** Apply one validated import row, updating the running counts. Returns the id. */
async function upsertImportedRecipient(
  data: RecipientInput,
  options: ImportOptions,
  report: ImportReport
): Promise<string> {
  const existing = await findByEmail(data.email);

  if (!existing) {
    const created = await prisma.recipient.create({ data });
    report.created++;
    return created.id;
  }

  if (existing.deletedAt) {
    await prisma.recipient.update({
      where: { id: existing.id },
      data: { ...data, deletedAt: null },
    });
    report.reactivated++;
    return existing.id;
  }

  if (options.updateExisting) {
    await prisma.recipient.update({ where: { id: existing.id }, data });
    report.updated++;
  } else {
    report.skipped++;
  }
  return existing.id;
}
