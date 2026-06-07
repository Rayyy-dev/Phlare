"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/guard";
import { recipientSchema } from "@/lib/validation";
import {
  createRecipient,
  updateRecipient,
  reactivateRecipient,
  softDeleteRecipient,
  DuplicateRecipientError,
  SoftDeletedRecipientError,
} from "@/server/recipients/service";

export interface RecipientFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Set when the email matches a soft-deleted recipient who can be reactivated. */
  reactivateId?: string;
  /** Set on a successful create/reactivate so the modal can close itself. */
  ok?: boolean;
}

function readForm(formData: FormData) {
  return {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    department: formData.get("department"),
    position: formData.get("position"),
  };
}

function collectFieldErrors(
  result: ReturnType<typeof recipientSchema.safeParse>
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path[0]?.toString() ?? "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

export async function createRecipientAction(
  _prev: RecipientFormState,
  formData: FormData
): Promise<RecipientFormState> {
  const admin = await requireAdmin();
  const parsed = recipientSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: collectFieldErrors(parsed) };

  try {
    await createRecipient(parsed.data, admin.id);
  } catch (err) {
    if (err instanceof SoftDeletedRecipientError) {
      return {
        reactivateId: err.existingId,
        error:
          "A previously deleted recipient has this email. Reactivate them to restore the record with these details.",
      };
    }
    if (err instanceof DuplicateRecipientError) {
      return { fieldErrors: { email: "A recipient with this email already exists." } };
    }
    throw err;
  }

  revalidatePath("/recipients");
  return { ok: true };
}

export async function reactivateRecipientAction(
  _prev: RecipientFormState,
  formData: FormData
): Promise<RecipientFormState> {
  const admin = await requireAdmin();
  const id = formData.get("reactivateId")?.toString();
  const parsed = recipientSchema.safeParse(readForm(formData));
  if (!id) return { error: "Missing recipient to reactivate." };
  if (!parsed.success) return { fieldErrors: collectFieldErrors(parsed) };

  await reactivateRecipient(id, parsed.data, admin.id);
  revalidatePath("/recipients");
  return { ok: true };
}

export async function updateRecipientAction(
  _prev: RecipientFormState,
  formData: FormData
): Promise<RecipientFormState> {
  const admin = await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return { error: "Missing recipient id." };

  const parsed = recipientSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: collectFieldErrors(parsed) };

  try {
    await updateRecipient(id, parsed.data, admin.id);
  } catch (err) {
    if (err instanceof DuplicateRecipientError) {
      return { fieldErrors: { email: "Another recipient already uses this email." } };
    }
    throw err;
  }

  revalidatePath("/recipients");
  redirect("/recipients");
}

export async function deleteRecipientAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return;
  await softDeleteRecipient(id, admin.id);
  revalidatePath("/recipients");
}
