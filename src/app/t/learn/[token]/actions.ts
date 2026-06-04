"use server";

import { gradeAndStore, type QuizFeedback } from "@/server/quizzes/service";

export interface QuizState {
  feedback?: QuizFeedback;
}

/**
 * Public quiz submission from the teachable-moment page. Reads the chosen option
 * index per question (`q0`, `q1`, …) and grades server-side. No authentication —
 * the tracking token authorises the submission; an unknown token simply yields
 * no feedback.
 */
export async function submitQuizAction(
  _prev: QuizState,
  formData: FormData
): Promise<QuizState> {
  const token = formData.get("token")?.toString();
  if (!token) return {};

  const answers: number[] = [];
  for (const [key, value] of formData.entries()) {
    const match = key.match(/^q(\d+)$/);
    if (match) answers[Number(match[1])] = Number(value);
  }

  const feedback = await gradeAndStore(token, answers);
  return feedback ? { feedback } : {};
}
