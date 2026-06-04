"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/guard";
import { sendingProfileSchema, testEmailSchema } from "@/lib/validation";
import {
  createProfile,
  updateProfile,
  softDeleteProfile,
  sendTestEmail,
} from "@/server/sending-profiles/service";

export interface ProfileFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function readProfile(formData: FormData) {
  return sendingProfileSchema.safeParse({
    name: formData.get("name"),
    host: formData.get("host"),
    port: formData.get("port"),
    username: formData.get("username"),
    password: formData.get("password"),
    security: formData.get("security"),
    fromName: formData.get("fromName"),
    fromEmail: formData.get("fromEmail"),
  });
}

function fieldErrorsOf(result: ReturnType<typeof readProfile>) {
  const fieldErrors: Record<string, string> = {};
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path[0]?.toString() ?? "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

export async function createProfileAction(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const admin = await requireAdmin();
  const parsed = readProfile(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed) };
  const id = await createProfile(parsed.data, admin.id);
  revalidatePath("/sending-profiles");
  // Land on the edit page so the admin can immediately send a test.
  redirect(`/sending-profiles/${id}/edit`);
}

export async function updateProfileAction(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const admin = await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return { error: "Missing profile id." };
  const parsed = readProfile(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed) };
  await updateProfile(id, parsed.data, admin.id);
  revalidatePath("/sending-profiles");
  redirect("/sending-profiles");
}

export async function deleteProfileAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return;
  await softDeleteProfile(id, admin.id);
  revalidatePath("/sending-profiles");
}

export interface TestEmailState {
  ok?: boolean;
  message?: string;
}

export async function testEmailAction(
  _prev: TestEmailState,
  formData: FormData
): Promise<TestEmailState> {
  const admin = await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return { ok: false, message: "Missing profile id." };

  const parsed = testEmailSchema.safeParse({ to: formData.get("to") });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid address." };
  }

  const result = await sendTestEmail(id, parsed.data.to, admin.id);
  revalidatePath(`/sending-profiles/${id}/edit`);
  return result.ok
    ? { ok: true, message: `Test email sent to ${parsed.data.to}.` }
    : { ok: false, message: result.error ?? "Send failed." };
}
