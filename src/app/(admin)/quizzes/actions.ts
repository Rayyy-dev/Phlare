"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/guard";
import { quizSchema } from "@/lib/validation";
import { createQuiz, updateQuiz, deleteQuiz } from "@/server/quizzes/service";

export interface QuizFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function readQuiz(formData: FormData) {
  let questions: unknown = [];
  try {
    questions = JSON.parse(formData.get("questions")?.toString() ?? "[]");
  } catch {
    questions = [];
  }
  return quizSchema.safeParse({
    title: formData.get("title"),
    templateId: formData.get("templateId"),
    questions,
  });
}

function fieldErrorsOf(result: ReturnType<typeof readQuiz>) {
  const fieldErrors: Record<string, string> = {};
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

export async function createQuizAction(
  _prev: QuizFormState,
  formData: FormData
): Promise<QuizFormState> {
  const admin = await requireAdmin();
  const parsed = readQuiz(formData);
  if (!parsed.success) return { error: "Please fix the quiz before saving.", fieldErrors: fieldErrorsOf(parsed) };
  await createQuiz(parsed.data, admin.id);
  revalidatePath("/quizzes");
  redirect("/quizzes");
}

export async function updateQuizAction(
  _prev: QuizFormState,
  formData: FormData
): Promise<QuizFormState> {
  const admin = await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return { error: "Missing quiz id." };
  const parsed = readQuiz(formData);
  if (!parsed.success) return { error: "Please fix the quiz before saving.", fieldErrors: fieldErrorsOf(parsed) };
  await updateQuiz(id, parsed.data, admin.id);
  revalidatePath("/quizzes");
  redirect("/quizzes");
}

export async function deleteQuizAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return;
  await deleteQuiz(id, admin.id);
  revalidatePath("/quizzes");
}
