import { BackLink } from "@/components/BackLink";
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
        <BackLink href="/quizzes" label="Quizzes" />
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">New quiz</h1>
      </div>
      <div className="card">
        <QuizForm mode="create" templates={templates.map((t) => ({ id: t.id, name: t.name }))} />
      </div>
    </div>
  );
}
