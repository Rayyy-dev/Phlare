"use client";

import { useActionState } from "react";
import { submitQuizAction, type QuizState } from "./actions";

const empty: QuizState = {};

/**
 * Knowledge-check quiz on the teachable-moment page. Renders the questions and
 * options (the correct answers are not present client-side — grading is
 * server-side); after submission it shows the score and per-question feedback.
 */
export function QuizRunner({
  token,
  title,
  questions,
  alreadyAnswered,
}: {
  token: string;
  title: string;
  questions: { q: string; options: string[] }[];
  alreadyAnswered: boolean;
}) {
  const [state, run, pending] = useActionState(submitQuizAction, empty);

  if (state.feedback) {
    const f = state.feedback;
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          You scored {f.score} / {f.total}
        </h2>
        <ol className="space-y-4">
          {f.questions.map((q, i) => {
            const correct = q.chosen === q.correctIndex;
            return (
              <li key={i} className="rounded-md border border-ink-200 p-3">
                <p className="font-medium text-ink-800">{q.q}</p>
                <p className={`mt-1 text-sm ${correct ? "text-green-700" : "text-red-600"}`}>
                  {correct ? "Correct" : `Your answer: ${q.options[q.chosen] ?? "—"}`}
                  {!correct && ` · Correct: ${q.options[q.correctIndex]}`}
                </p>
                {q.explanation && <p className="mt-1 text-sm text-ink-600">{q.explanation}</p>}
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  return (
    <form action={run} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <h2 className="text-lg font-semibold">{title}</h2>
      {alreadyAnswered && (
        <p className="rounded-md bg-ink-50 px-3 py-2 text-xs text-ink-500">
          You have already completed this quiz; submitting again will not change your recorded result.
        </p>
      )}
      <ol className="space-y-5">
        {questions.map((q, i) => (
          <li key={i}>
            <p className="font-medium text-ink-800">{i + 1}. {q.q}</p>
            <div className="mt-2 space-y-1">
              {q.options.map((opt, j) => (
                <label key={j} className="flex items-center gap-2 text-sm text-ink-700">
                  <input type="radio" name={`q${i}`} value={j} required className="h-4 w-4" />
                  {opt}
                </label>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Submitting…" : "Submit answers"}
      </button>
    </form>
  );
}
