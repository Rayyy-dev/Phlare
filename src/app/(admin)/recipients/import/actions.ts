"use server";

import { requireAdmin } from "@/server/auth/guard";
import {
  importRecipientsFromCsv,
  type ImportReport,
} from "@/server/recipients/service";
import { RECIPIENT_FIELDS, type RecipientField } from "@/lib/validation";

export interface ImportState {
  error?: string;
  report?: ImportReport;
}

export async function importAction(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  const admin = await requireAdmin();

  const csvText = formData.get("csvText")?.toString() ?? "";
  if (!csvText.trim()) return { error: "Choose a CSV file to import." };

  // Parse the column mapping; the email column is the one mandatory mapping.
  let mapping: Record<RecipientField, string>;
  try {
    const raw = JSON.parse(formData.get("mapping")?.toString() ?? "{}");
    mapping = {} as Record<RecipientField, string>;
    for (const field of RECIPIENT_FIELDS) {
      mapping[field] = typeof raw[field] === "string" ? raw[field] : "";
    }
  } catch {
    return { error: "Invalid column mapping." };
  }
  if (!mapping.email) return { error: "Map the column that contains the email address." };

  const groupId = formData.get("groupId")?.toString() || undefined;
  const updateExisting = formData.get("updateExisting") === "on";

  try {
    const report = await importRecipientsFromCsv(
      csvText,
      { mapping, updateExisting, groupId },
      admin.id
    );
    return { report };
  } catch (err) {
    console.error("[import] failed", err);
    return { error: "The file could not be processed." };
  }
}
