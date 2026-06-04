import { redirect } from "next/navigation";
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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Phlare</h1>
        <p className="mt-1 text-sm text-slate-600">Administrator sign-in</p>
      </div>
      <div className="card">
        <LoginForm />
      </div>
    </main>
  );
}
