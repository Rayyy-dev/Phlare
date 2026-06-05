"use client";

import { useActionState } from "react";
import { HtmlEditor } from "@/components/HtmlEditor";
import {
  DIFFICULTIES,
  PSYCH_PRINCIPLES,
  type EmailTemplateInput,
} from "@/lib/validation";
import { PERSONALISATION_VARIABLES } from "@/lib/personalization";
import {
  createTemplateAction,
  updateTemplateAction,
  type TemplateFormState,
} from "./actions";

type Template = EmailTemplateInput & { id: string };
const empty: TemplateFormState = {};

const PRINCIPLE_LABELS: Record<string, string> = {
  AUTHORITY: "Authority",
  URGENCY: "Urgency / scarcity",
  SOCIAL_PROOF: "Social proof",
  RECIPROCITY: "Reciprocity",
  LIKING: "Liking",
  CURIOSITY_FEAR: "Curiosity / fear",
};

export function TemplateForm({
  mode,
  template,
  company,
}: {
  mode: "create" | "edit";
  template?: Template;
  company: string;
}) {
  const action = mode === "edit" ? updateTemplateAction : createTemplateAction;
  const [state, run, pending] = useActionState(action, empty);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={run} className="space-y-5" noValidate>
      {mode === "edit" && <input type="hidden" name="id" value={template?.id} />}
      {state.error && (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Template name</label>
          <input id="name" name="name" className="input" defaultValue={template?.name} required />
          {fe.name && <p className="form-error">{fe.name}</p>}
        </div>
        <div>
          <label className="label" htmlFor="subject">Subject line</label>
          <input id="subject" name="subject" className="input" defaultValue={template?.subject} required />
          {fe.subject && <p className="form-error">{fe.subject}</p>}
        </div>
        <div>
          <label className="label" htmlFor="senderName">Sender name</label>
          <input id="senderName" name="senderName" className="input" defaultValue={template?.senderName} placeholder="IT Helpdesk" required />
          {fe.senderName && <p className="form-error">{fe.senderName}</p>}
        </div>
        <div>
          <label className="label" htmlFor="senderEmail">Sender email</label>
          <input id="senderEmail" name="senderEmail" type="email" className="input" defaultValue={template?.senderEmail} placeholder="helpdesk@acme-corp.example" required />
          {fe.senderEmail && <p className="form-error">{fe.senderEmail}</p>}
        </div>
        <div>
          <label className="label" htmlFor="difficulty">Difficulty</label>
          <select id="difficulty" name="difficulty" className="input" defaultValue={template?.difficulty ?? "MEDIUM"}>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="principle">Psychological principle</label>
          <select id="principle" name="principle" className="input" defaultValue={template?.principle ?? "AUTHORITY"}>
            {PSYCH_PRINCIPLES.map((p) => <option key={p} value={p}>{PRINCIPLE_LABELS[p]}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-md bg-slate-50 px-4 py-3 text-xs text-slate-600">
        Personalisation variables:{" "}
        {PERSONALISATION_VARIABLES.map((v) => (
          <code key={v} className="mr-1 rounded bg-white px-1.5 py-0.5 text-slate-700">{`{{${v}}}`}</code>
        ))}
        <span className="ml-1">— anything else is left as-is.</span>
      </div>

      <HtmlEditor name="htmlBody" defaultValue={template?.htmlBody} company={company} />
      {fe.htmlBody && <p className="form-error">{fe.htmlBody}</p>}

      <div>
        <label className="label" htmlFor="textBody">Plain-text alternative <span className="text-slate-500">(optional)</span></label>
        <textarea id="textBody" name="textBody" className="input min-h-24 font-mono text-xs" defaultValue={template?.textBody ?? ""} />
      </div>

      <div>
        <label className="label" htmlFor="redFlags">Red flags <span className="text-slate-500">(one per line — shown on the teachable-moment page)</span></label>
        <textarea id="redFlags" name="redFlags" className="input min-h-28" defaultValue={(template?.redFlags ?? []).join("\n")}
          placeholder={"Mismatched sender address\nUrgent deadline pressure\nGeneric greeting"} />
      </div>

      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : mode === "edit" ? "Save template" : "Create template"}
        </button>
        <a href="/templates" className="btn-secondary">Cancel</a>
      </div>
    </form>
  );
}
