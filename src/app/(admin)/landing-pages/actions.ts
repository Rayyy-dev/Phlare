"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/guard";
import { landingPageSchema } from "@/lib/validation";
import {
  createLandingPage,
  updateLandingPage,
  softDeleteLandingPage,
} from "@/server/landing-pages/service";

export interface LandingFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function readLanding(formData: FormData) {
  let fieldDefs: unknown = [];
  try {
    fieldDefs = JSON.parse(formData.get("fieldDefs")?.toString() ?? "[]");
  } catch {
    fieldDefs = [];
  }
  return landingPageSchema.safeParse({
    name: formData.get("name"),
    htmlBody: formData.get("htmlBody"),
    hasForm: formData.get("hasForm") === "on",
    fieldDefs,
    difficulty: formData.get("difficulty"),
  });
}

function fieldErrorsOf(result: ReturnType<typeof readLanding>) {
  const fieldErrors: Record<string, string> = {};
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path[0]?.toString() ?? "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

export async function createLandingPageAction(
  _prev: LandingFormState,
  formData: FormData
): Promise<LandingFormState> {
  const admin = await requireAdmin();
  const parsed = readLanding(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed) };
  await createLandingPage(parsed.data, admin.id);
  revalidatePath("/landing-pages");
  redirect("/landing-pages");
}

export async function updateLandingPageAction(
  _prev: LandingFormState,
  formData: FormData
): Promise<LandingFormState> {
  const admin = await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return { error: "Missing landing page id." };
  const parsed = readLanding(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed) };
  await updateLandingPage(id, parsed.data, admin.id);
  revalidatePath("/landing-pages");
  redirect("/landing-pages");
}

export async function deleteLandingPageAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return;
  await softDeleteLandingPage(id, admin.id);
  revalidatePath("/landing-pages");
}
