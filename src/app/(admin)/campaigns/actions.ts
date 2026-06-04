"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/guard";
import { campaignSchema } from "@/lib/validation";
import {
  createCampaign,
  launchCampaign,
  pauseCampaign,
  resumeCampaign,
  stopCampaign,
  softDeleteCampaign,
  CampaignError,
} from "@/server/campaigns/service";

export interface CampaignFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function createCampaignAction(
  _prev: CampaignFormState,
  formData: FormData
): Promise<CampaignFormState> {
  const admin = await requireAdmin();
  const parsed = campaignSchema.safeParse({
    name: formData.get("name"),
    emailTemplateId: formData.get("emailTemplateId"),
    landingPageId: formData.get("landingPageId"),
    sendingProfileId: formData.get("sendingProfileId"),
    quizId: formData.get("quizId"),
    groupIds: formData.getAll("groupIds").map(String).filter(Boolean),
    scheduledAt: formData.get("scheduledAt"),
    throttlePerMinute: formData.get("throttlePerMinute"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const id = await createCampaign(parsed.data, admin.id);
  revalidatePath("/campaigns");
  redirect(`/campaigns/${id}`);
}

export interface LaunchState {
  error?: string;
}

export async function launchCampaignAction(
  _prev: LaunchState,
  formData: FormData
): Promise<LaunchState> {
  const admin = await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return { error: "Missing campaign id." };
  const acknowledged = formData.get("ack") === "on";

  try {
    await launchCampaign(id, admin.id, acknowledged);
  } catch (err) {
    if (err instanceof CampaignError) return { error: err.message };
    throw err;
  }
  revalidatePath(`/campaigns/${id}`);
  redirect(`/campaigns/${id}`);
}

async function lifecycle(
  formData: FormData,
  fn: (id: string, actorId: string) => Promise<void>
) {
  const admin = await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return;
  await fn(id, admin.id);
  revalidatePath(`/campaigns/${id}`);
}

export async function pauseCampaignAction(formData: FormData) {
  await lifecycle(formData, pauseCampaign);
}
export async function resumeCampaignAction(formData: FormData) {
  await lifecycle(formData, resumeCampaign);
}
export async function stopCampaignAction(formData: FormData) {
  await lifecycle(formData, stopCampaign);
}

export async function deleteCampaignAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return;
  await softDeleteCampaign(id, admin.id);
  revalidatePath("/campaigns");
  redirect("/campaigns");
}
