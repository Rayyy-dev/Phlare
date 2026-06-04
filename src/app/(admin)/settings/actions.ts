"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/guard";
import { settingsSchema } from "@/lib/validation";
import { updateSettings } from "@/server/settings/settings";

export interface SettingsFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  saved?: boolean;
}

export async function updateSettingsAction(
  _prev: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const admin = await requireAdmin();
  const parsed = settingsSchema.safeParse({
    orgName: formData.get("orgName"),
    baseUrl: formData.get("baseUrl"),
    defaultThrottlePerMinute: formData.get("defaultThrottlePerMinute"),
    retentionDays: formData.get("retentionDays"),
    reportEmail: formData.get("reportEmail"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  await updateSettings(parsed.data, admin.id);
  revalidatePath("/settings");
  return { saved: true };
}
