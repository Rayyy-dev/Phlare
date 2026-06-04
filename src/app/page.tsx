import { redirect } from "next/navigation";
import { isSetupComplete } from "@/server/settings/settings";
import { getCurrentAdmin } from "@/server/auth/session";

// Routing depends on live DB/session state — never prerender at build time.
export const dynamic = "force-dynamic";

/**
 * Entry point. Routes the visitor to the right place depending on application
 * state: first-run setup, login, or the dashboard.
 */
export default async function Home() {
  if (!(await isSetupComplete())) {
    redirect("/setup");
  }
  const admin = await getCurrentAdmin();
  redirect(admin ? "/dashboard" : "/login");
}
