"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { loginSchema } from "@/lib/validation";
import { authenticateAdmin } from "@/server/auth/admin-auth";
import { createSession, setSessionCookie } from "@/server/auth/session";
import { isSetupComplete } from "@/server/settings/settings";

export interface LoginFormState {
  error?: string;
}

export async function loginAction(
  _prev: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  if (!(await isSetupComplete())) {
    redirect("/setup");
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  // Generic message — never reveal whether the email exists or the format failed.
  if (!parsed.success) {
    return { error: "Invalid email or password." };
  }

  const result = await authenticateAdmin(parsed.data.email, parsed.data.password);

  if (!result.ok) {
    if (result.reason === "locked") {
      return {
        error:
          "This account is temporarily locked after repeated failed attempts. Try again in 15 minutes.",
      };
    }
    return { error: "Invalid email or password." };
  }

  const hdrs = await headers();
  const token = await createSession(result.admin.id, {
    ip: hdrs.get("x-forwarded-for") ?? undefined,
    userAgent: hdrs.get("user-agent") ?? undefined,
  });
  await setSessionCookie(token);

  redirect("/dashboard");
}
