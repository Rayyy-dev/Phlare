import { prisma } from "@/server/db";
import { recordAudit } from "@/server/audit/log";
import { quizSchema, type QuizInput, type QuizQuestionInput } from "@/lib/validation";
import type { Prisma } from "@prisma/client";

export function listQuizzes() {
  return prisma.quiz.findMany({
    orderBy: { createdAt: "desc" },
    include: { template: { select: { name: true } }, _count: { select: { results: true } } },
  });
}

export function getQuiz(id: string) {
  return prisma.quiz.findUnique({ where: { id } });
}

export async function createQuiz(input: QuizInput, actorId: string): Promise<string> {
  const data = quizSchema.parse(input);
  const quiz = await prisma.quiz.create({
    data: {
      title: data.title,
      templateId: data.templateId ?? null,
      questions: data.questions as unknown as Prisma.InputJsonValue,
    },
  });
  await recordAudit({ actorAdminId: actorId, action: "quiz.created", entityType: "Quiz", entityId: quiz.id, details: { title: quiz.title } });
  return quiz.id;
}

export async function updateQuiz(id: string, input: QuizInput, actorId: string): Promise<void> {
  const data = quizSchema.parse(input);
  await prisma.quiz.update({
    where: { id },
    data: {
      title: data.title,
      templateId: data.templateId ?? null,
      questions: data.questions as unknown as Prisma.InputJsonValue,
    },
  });
  await recordAudit({ actorAdminId: actorId, action: "quiz.updated", entityType: "Quiz", entityId: id });
}

export async function deleteQuiz(id: string, actorId: string): Promise<void> {
  // Quiz has no soft-delete; campaigns referencing it are unlinked (SetNull) and
  // its results are removed (Cascade) by the schema's referential actions.
  await prisma.quiz.delete({ where: { id } });
  await recordAudit({ actorAdminId: actorId, action: "quiz.deleted", entityType: "Quiz", entityId: id });
}

export interface QuizFeedback {
  score: number;
  total: number;
  questions: { q: string; options: string[]; correctIndex: number; explanation?: string; chosen: number }[];
}

/**
 * Grade a recipient's quiz answers and store the result. Called from the public
 * teachable-moment page. We persist only the chosen option INDICES (never free
 * text), tied to the CampaignTarget, and record QUIZ_COMPLETED once.
 *
 * Grading happens server-side so the correct answers are not exposed before the
 * quiz is submitted. Safe on unknown tokens or campaigns without a quiz (returns
 * null, leaking nothing).
 */
export async function gradeAndStore(
  token: string,
  answers: number[]
): Promise<QuizFeedback | null> {
  const target = await prisma.campaignTarget.findUnique({
    where: { trackingToken: token },
    include: { campaign: { include: { quiz: true } } },
  });
  const quiz = target?.campaign.quiz;
  if (!target || !quiz) return null;

  const questions = quiz.questions as unknown as QuizQuestionInput[];
  const chosen = questions.map((_, i) => (Number.isInteger(answers[i]) ? answers[i] : -1));
  const score = questions.reduce((acc, q, i) => acc + (chosen[i] === q.correctIndex ? 1 : 0), 0);
  const total = questions.length;

  // One result per (target, quiz): create only if none exists yet.
  const existing = await prisma.quizResult.findFirst({
    where: { quizId: quiz.id, campaignTargetId: target.id },
  });
  if (!existing) {
    await prisma.quizResult.create({
      data: {
        quizId: quiz.id,
        campaignTargetId: target.id,
        score,
        total,
        answers: chosen as unknown as Prisma.InputJsonValue, // indices only
      },
    });
    await prisma.event.create({
      data: { campaignTargetId: target.id, type: "QUIZ_COMPLETED", metadata: { score, total } },
    });
  }

  return {
    score,
    total,
    questions: questions.map((q, i) => ({
      q: q.q,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      chosen: chosen[i],
    })),
  };
}

/** Quiz questions for the recipient to answer — WITHOUT the correct answers. */
export async function getQuizForToken(token: string) {
  const target = await prisma.campaignTarget.findUnique({
    where: { trackingToken: token },
    include: { campaign: { include: { quiz: true } } },
  });
  const quiz = target?.campaign.quiz;
  if (!quiz) return null;
  const questions = quiz.questions as unknown as QuizQuestionInput[];
  const answered = await prisma.quizResult.findFirst({
    where: { quizId: quiz.id, campaignTargetId: target!.id },
    select: { id: true },
  });
  return {
    title: quiz.title,
    alreadyAnswered: answered != null,
    questions: questions.map((q) => ({ q: q.q, options: q.options })),
  };
}
