"use client";

import { useActionState, useState } from "react";
import { HtmlEditor } from "@/components/HtmlEditor";
import {
  DIFFICULTIES,
  LANDING_FIELD_TYPES,
  type LandingFieldDef,
  type LandingPageInput,
} from "@/lib/validation";
import {
  createLandingPageAction,
  updateLandingPageAction,
  type LandingFormState,
} from "./actions";

type LandingPage = LandingPageInput & { id: string };
const empty: LandingFormState = {};

export function LandingPageForm({
  mode,
  page,
}: {
  mode: "create" | "edit";
  page?: LandingPage;
}) {
  const action = mode === "edit" ? updateLandingPageAction : createLandingPageAction;
  const [state, run, pending] = useActionState(action, empty);
  const fe = state.fieldErrors ?? {};

  const [hasForm, setHasForm] = useState(page?.hasForm ?? false);
  const [fields, setFields] = useState<LandingFieldDef[]>(page?.fieldDefs ?? []);

  const addField = () => setFields((f) => [...f, { name: "", label: "", type: "text" }]);
  const removeField = (i: number) => setFields((f) => f.filter((_, idx) => idx !== i));
  const updateField = (i: number, patch: Partial<LandingFieldDef>) =>
    setFields((f) => f.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  return (
    <form action={run} className="space-y-5" noValidate>
      {mode === "edit" && <input type="hidden" name="id" value={page?.id} />}
      {state.error && (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Page name</label>
          <input id="name" name="name" className="input" defaultValue={page?.name} required />
          {fe.name && <p className="form-error">{fe.name}</p>}
        </div>
        <div>
          <label className="label" htmlFor="difficulty">Difficulty</label>
          <select id="difficulty" name="difficulty" className="input" defaultValue={page?.difficulty ?? "MEDIUM"}>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* The trackingLink is the only personalisation variable meaningful on a
          landing page; preview without sample substitution to keep it literal. */}
      <HtmlEditor name="htmlBody" defaultValue={page?.htmlBody} personalise={false} />
      {fe.htmlBody && <p className="form-error">{fe.htmlBody}</p>}

      <div className="rounded-md border border-slate-200 p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" name="hasForm" className="h-4 w-4" checked={hasForm} onChange={(e) => setHasForm(e.target.checked)} />
          This page shows a fake form
        </label>

        {hasForm && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-slate-500">
              Define the form fields below. Only the field <strong>name, label and
              type</strong> are stored — a recipient&apos;s actual input is never
              captured or saved.
            </p>
            {/* Field definitions are serialised to JSON for the server action. */}
            <input type="hidden" name="fieldDefs" value={JSON.stringify(fields)} />

            {fields.map((field, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="label text-xs">Name</label>
                  <input className="input w-36" value={field.name} placeholder="username"
                    onChange={(e) => updateField(i, { name: e.target.value })} />
                </div>
                <div>
                  <label className="label text-xs">Label</label>
                  <input className="input w-44" value={field.label} placeholder="Username"
                    onChange={(e) => updateField(i, { label: e.target.value })} />
                </div>
                <div>
                  <label className="label text-xs">Type</label>
                  <select className="input w-32" value={field.type}
                    onChange={(e) => updateField(i, { type: e.target.value as LandingFieldDef["type"] })}>
                    {LANDING_FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <button type="button" className="pb-2 text-sm text-red-600 hover:text-red-700" onClick={() => removeField(i)}>Remove</button>
              </div>
            ))}
            <button type="button" className="btn-secondary" onClick={addField}>Add field</button>
            {fe.fieldDefs && <p className="form-error">{fe.fieldDefs}</p>}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : mode === "edit" ? "Save landing page" : "Create landing page"}
        </button>
        <a href="/landing-pages" className="btn-secondary">Cancel</a>
      </div>
    </form>
  );
}
