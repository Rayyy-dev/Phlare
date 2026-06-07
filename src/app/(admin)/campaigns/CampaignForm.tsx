"use client";

import { useActionState } from "react";
import { createCampaignAction, type CampaignFormState } from "./actions";

interface Option { id: string; name: string }

const empty: CampaignFormState = {};

export function CampaignForm({
  templates,
  landingPages,
  profiles,
  groups,
  quizzes,
}: {
  templates: Option[];
  landingPages: Option[];
  profiles: Option[];
  groups: (Option & { memberCount: number })[];
  quizzes: Option[];
}) {
  const [state, run, pending] = useActionState(createCampaignAction, empty);
  const fe = state.fieldErrors ?? {};

  const missingContent = templates.length === 0 || landingPages.length === 0 || profiles.length === 0;

  return (
    <form action={run} className="space-y-5" noValidate>
      {missingContent && (
        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You need at least one email template, one landing page, and one sending
          profile before creating a campaign.
        </div>
      )}

      <div>
        <label className="label" htmlFor="name">Campaign name</label>
        <input id="name" name="name" className="input" required />
        {fe.name && <p className="form-error">{fe.name}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="emailTemplateId">Email template</label>
          <select id="emailTemplateId" name="emailTemplateId" className="input" defaultValue="">
            <option value="" disabled>Select…</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {fe.emailTemplateId && <p className="form-error">{fe.emailTemplateId}</p>}
        </div>
        <div>
          <label className="label" htmlFor="landingPageId">Landing page</label>
          <select id="landingPageId" name="landingPageId" className="input" defaultValue="">
            <option value="" disabled>Select…</option>
            {landingPages.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          {fe.landingPageId && <p className="form-error">{fe.landingPageId}</p>}
        </div>
        <div>
          <label className="label" htmlFor="sendingProfileId">Sending profile</label>
          <select id="sendingProfileId" name="sendingProfileId" className="input" defaultValue="">
            <option value="" disabled>Select…</option>
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {fe.sendingProfileId && <p className="form-error">{fe.sendingProfileId}</p>}
        </div>
      </div>

      <div>
        <span className="label">Target groups</span>
        <div className="space-y-1 rounded-md border border-ink-200 p-3">
          {groups.length === 0 ? (
            <p className="text-sm text-ink-500">No groups yet — create one under Groups.</p>
          ) : (
            groups.map((g) => (
              <label key={g.id} className="flex items-center gap-2 text-sm text-ink-700">
                <input type="checkbox" name="groupIds" value={g.id} className="h-4 w-4" />
                {g.name} <span className="text-ink-500">({g.memberCount})</span>
              </label>
            ))
          )}
        </div>
        {fe.groupIds && <p className="form-error">{fe.groupIds}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="quizId">Knowledge-check quiz <span className="text-ink-500">(optional)</span></label>
          <select id="quizId" name="quizId" className="input" defaultValue="">
            <option value="">None</option>
            {quizzes.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="scheduledAt">Schedule <span className="text-ink-500">(blank = on launch)</span></label>
          <input id="scheduledAt" name="scheduledAt" type="datetime-local" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="throttlePerMinute">Send rate (per minute)</label>
          <input id="throttlePerMinute" name="throttlePerMinute" type="number" className="input" defaultValue={60} min={1} />
          {fe.throttlePerMinute && <p className="form-error">{fe.throttlePerMinute}</p>}
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={pending || missingContent}>
          {pending ? "Creating…" : "Create draft"}
        </button>
        <a href="/campaigns" className="btn-secondary">Cancel</a>
      </div>
    </form>
  );
}
