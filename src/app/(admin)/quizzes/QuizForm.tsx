"use client";

import { useActionState, useState } from "react";
import { createQuizAction, updateQuizAction, type QuizFormState } from "./actions";
import type { QuizInput, QuizQuestionInput } from "@/lib/validation";

type Quiz = QuizInput & { id: string };
const empty: QuizFormState = {};
const blankQuestion = (): QuizQuestionInput => ({ q: "", options: ["", ""], correctIndex: 0, explanation: undefined });

export function QuizForm({
  mode,
  quiz,
  templates,
}: {
  mode: "create" | "edit";
  quiz?: Quiz;
  templates: { id: string; name: string }[];
}) {
  const action = mode === "edit" ? updateQuizAction : createQuizAction;
  const [state, run, pending] = useActionState(action, empty);
  const [questions, setQuestions] = useState<QuizQuestionInput[]>(quiz?.questions ?? [blankQuestion()]);

  const patch = (i: number, p: Partial<QuizQuestionInput>) =>
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...p } : q)));
  const patchOption = (qi: number, oi: number, value: string) =>
    setQuestions((qs) => qs.map((q, idx) => (idx === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? value : o)) } : q)));

  return (
    <form action={run} className="space-y-6" noValidate>
      {mode === "edit" && <input type="hidden" name="id" value={quiz?.id} />}
      <input type="hidden" name="questions" value={JSON.stringify(questions)} />
      {state.error && <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="title">Quiz title</label>
          <input id="title" name="title" className="input" defaultValue={quiz?.title} required />
        </div>
        <div>
          <label className="label" htmlFor="templateId">Related template <span className="text-slate-400">(optional)</span></label>
          <select id="templateId" name="templateId" className="input" defaultValue={quiz?.templateId ?? ""}>
            <option value="">None</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((question, qi) => (
          <div key={qi} className="rounded-md border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600">Question {qi + 1}</span>
              {questions.length > 1 && (
                <button type="button" className="text-sm text-red-600" onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== qi))}>Remove</button>
              )}
            </div>
            <input className="input mt-2" placeholder="Question text" value={question.q} onChange={(e) => patch(qi, { q: e.target.value })} />

            <p className="mt-3 text-xs text-slate-500">Select the correct answer:</p>
            <div className="mt-1 space-y-2">
              {question.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input type="radio" name={`correct-${qi}`} checked={question.correctIndex === oi} onChange={() => patch(qi, { correctIndex: oi })} className="h-4 w-4" />
                  <input className="input" placeholder={`Option ${oi + 1}`} value={opt} onChange={(e) => patchOption(qi, oi, e.target.value)} />
                  {question.options.length > 2 && (
                    <button type="button" className="text-sm text-slate-400 hover:text-red-600"
                      onClick={() => patch(qi, {
                        options: question.options.filter((_, j) => j !== oi),
                        // Keep correctIndex pointing at the same option after removal.
                        correctIndex: oi === question.correctIndex ? 0 : oi < question.correctIndex ? question.correctIndex - 1 : question.correctIndex,
                      })}>×</button>
                  )}
                </div>
              ))}
            </div>
            {question.options.length < 4 && (
              <button type="button" className="mt-2 text-sm text-brand-600" onClick={() => patch(qi, { options: [...question.options, ""] })}>Add option</button>
            )}

            <textarea className="input mt-3 min-h-16 text-sm" placeholder="Explanation shown after answering (optional)"
              value={question.explanation ?? ""} onChange={(e) => patch(qi, { explanation: e.target.value || undefined })} />
          </div>
        ))}
      </div>

      {questions.length < 10 && (
        <button type="button" className="btn-secondary" onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}>Add question</button>
      )}

      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : mode === "edit" ? "Save quiz" : "Create quiz"}
        </button>
        <a href="/quizzes" className="btn-secondary">Cancel</a>
      </div>
    </form>
  );
}
