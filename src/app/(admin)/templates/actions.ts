"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/guard";
import { emailTemplateSchema } from "@/lib/validation";
import {
  createTemplate,
  updateTemplate,
  softDeleteTemplate,
} from "@/server/templates/service";

export interface TemplateFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function readTemplate(formData: FormData) {
  return emailTemplateSchema.safeParse({
    name: formData.get("name"),
    subject: formData.get("subject"),
    senderName: formData.get("senderName"),
    senderEmail: formData.get("senderEmail"),
    htmlBody: formData.get("htmlBody"),
    textBody: formData.get("textBody"),
    difficulty: formData.get("difficulty"),
    principle: formData.get("principle"),
    // The red-flags textarea is one warning sign per line.
    redFlags: (formData.get("redFlags")?.toString() ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  });
}

function fieldErrorsOf(result: ReturnType<typeof readTemplate>) {
  const fieldErrors: Record<string, string> = {};
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path[0]?.toString() ?? "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

export async function createTemplateAction(
  _prev: TemplateFormState,
  formData: FormData
): Promise<TemplateFormState> {
  const admin = await requireAdmin();
  const parsed = readTemplate(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed) };
  await createTemplate(parsed.data, admin.id);
  revalidatePath("/templates");
  redirect("/templates");
}

export async function updateTemplateAction(
  _prev: TemplateFormState,
  formData: FormData
): Promise<TemplateFormState> {
  const admin = await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return { error: "Missing template id." };
  const parsed = readTemplate(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed) };
  await updateTemplate(id, parsed.data, admin.id);
  revalidatePath("/templates");
  redirect("/templates");
}

export async function deleteTemplateAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return;
  await softDeleteTemplate(id, admin.id);
  revalidatePath("/templates");
}
