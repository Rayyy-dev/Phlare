"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { setupSchema } from "@/lib/validation";
import {
  setupFirstAdmin,
  SetupAlreadyCompleteError,
} from "@/server/auth/admin-auth";
import { isSetupComplete } from "@/server/settings/settings";
import { createSession, setSessionCookie } from "@/server/auth/session";

export interface SetupFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/** First-run server action: validate, create the initial admin, sign them in. */
export async function setupAction(
  _prev: SetupFormState,
  formData: FormData
): Promise<SetupFormState> {
  // Guard: never allow a second setup even if the page is re-posted.
  if (await isSetupComplete()) {
    return { error: "Setup has already been completed. Please log in." };
  }

  const parsed = setupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    orgName: formData.get("orgName"),
    baseUrl: formData.get("baseUrl"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  let admin;
  try {
    admin = await setupFirstAdmin(parsed.data);
  } catch (err) {
    if (err instanceof SetupAlreadyCompleteError) {
      return { error: "Setup has already been completed. Please log in." };
    }
    console.error("[setup] failed", err);
    return { error: "Could not complete setup. Please try again." };
  }

  const hdrs = await headers();
  const token = await createSession(admin.id, {
    ip: hdrs.get("x-forwarded-for") ?? undefined,
    userAgent: hdrs.get("user-agent") ?? undefined,
  });
  await setSessionCookie(token);

  redirect("/dashboard");
}
