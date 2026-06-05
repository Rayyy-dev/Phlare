import { redirect } from "next/navigation";
import { isSetupComplete } from "@/server/settings/settings";
import { SetupForm } from "./SetupForm";

export const dynamic = "force-dynamic";

/**
 * First-run setup wizard (Section 5.1 / 11). Only reachable until the initial
 * admin exists; afterwards it redirects to login.
 */
export default async function SetupPage() {
  if (await isSetupComplete()) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome to Phlare
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Let&apos;s set up your administrator account and organisation. This is a
          one-time step.
        </p>
      </div>
      <div className="card">
        <SetupForm />
      </div>
      <p className="mt-6 text-center text-xs text-slate-500">
        Phlare — authorised internal security-awareness training only.
      </p>
    </main>
  );
}
