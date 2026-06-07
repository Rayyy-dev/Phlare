import { BackLink } from "@/components/BackLink";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/guard";
import { getQuiz } from "@/server/quizzes/service";
import { listTemplates } from "@/server/templates/service";
import { QuizForm } from "../../QuizForm";
import type { QuizInput, QuizQuestionInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

export default async function EditQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const [quiz, templates] = await Promise.all([getQuiz(id), listTemplates()]);
  if (!quiz) notFound();

  const formValue = {
    id: quiz.id,
    title: quiz.title,
    templateId: quiz.templateId ?? undefined,
    questions: quiz.questions as unknown as QuizQuestionInput[],
  } satisfies QuizInput & { id: string };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <BackLink href="/quizzes" label="Quizzes" />
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">Edit quiz</h1>
      </div>
      <div className="card">
        <QuizForm mode="edit" quiz={formValue} templates={templates.map((t) => ({ id: t.id, name: t.name }))} />
      </div>
    </div>
  );
}
