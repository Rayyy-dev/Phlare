import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/server/auth/session";
import { isSetupComplete } from "@/server/settings/settings";
import type { Admin } from "@prisma/client";

/**
 * Server-side route guard for the authenticated admin area. Use at the top of
 * any protected layout/page/server-action. Redirects to setup (if no admin
 * exists yet) or to login (if unauthenticated).
 */
export async function requireAdmin(): Promise<Admin> {
  if (!(await isSetupComplete())) {
    redirect("/setup");
  }
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/login");
  }
  return admin;
}
