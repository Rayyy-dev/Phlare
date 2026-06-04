import Link from "next/link";
import { requireAdmin } from "@/server/auth/guard";
import { listTemplates } from "@/server/templates/service";
import { QuizForm } from "../QuizForm";

export const dynamic = "force-dynamic";

export default async function NewQuizPage() {
  await requireAdmin();
  const templates = await listTemplates();
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/quizzes" className="text-sm text-slate-500 hover:text-slate-700">← Quizzes</Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">New quiz</h1>
      </div>
      <div className="card">
        <QuizForm mode="create" templates={templates.map((t) => ({ id: t.id, name: t.name }))} />
      </div>
    </div>
  );
}
