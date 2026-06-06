import { redirect } from "next/navigation";
import { Flame } from "lucide-react";
import { isSetupComplete } from "@/server/settings/settings";
import { SetupForm } from "./SetupForm";

export const dynamic = "force-dynamic";

/**
 * First-run setup wizard. Only reachable until the initial admin exists;
 * afterwards it redirects to login.
 */
export default async function SetupPage() {
  if (await isSetupComplete()) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink-100 px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-white shadow-pop">
            <Flame className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink-900">Welcome to Phlare</h1>
          <p className="mt-1 text-sm text-ink-500">
            Set up your administrator account and organisation. This is a one-time step.
          </p>
        </div>
        <div className="card">
          <SetupForm />
        </div>
        <p className="mt-6 text-center text-xs text-ink-400">
          Authorised internal security-awareness training only.
        </p>
      </div>
    </main>
  );
}
