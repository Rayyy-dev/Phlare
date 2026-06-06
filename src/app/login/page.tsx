import { redirect } from "next/navigation";
import { Flame } from "lucide-react";
import { isSetupComplete } from "@/server/settings/settings";
import { getCurrentAdmin } from "@/server/auth/session";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (!(await isSetupComplete())) {
    redirect("/setup");
  }
  if (await getCurrentAdmin()) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink-100 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-white shadow-pop">
            <Flame className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink-900">Sign in to Phlare</h1>
          <p className="mt-1 text-sm text-ink-500">Administrator console</p>
        </div>
        <div className="card">
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-ink-400">
          Authorised internal security-awareness training only.
        </p>
      </div>
    </main>
  );
}
