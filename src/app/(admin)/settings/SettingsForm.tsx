"use client";

import { useActionState } from "react";
import { updateSettingsAction, type SettingsFormState } from "./actions";

const empty: SettingsFormState = {};

export function SettingsForm({
  settings,
}: {
  settings: {
    orgName: string; baseUrl: string; defaultThrottlePerMinute: number;
    retentionDays: number; reportEmail: string | null;
  };
}) {
  const [state, run, pending] = useActionState(updateSettingsAction, empty);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={run} className="space-y-4" noValidate>
      {state.saved && <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">Settings saved.</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="orgName">Organisation name</label>
          <input id="orgName" name="orgName" className="input" defaultValue={settings.orgName} required />
          {fe.orgName && <p className="form-error">{fe.orgName}</p>}
        </div>
        <div>
          <label className="label" htmlFor="baseUrl">Public base URL</label>
          <input id="baseUrl" name="baseUrl" type="url" className="input" defaultValue={settings.baseUrl} required />
          {fe.baseUrl && <p className="form-error">{fe.baseUrl}</p>}
          <p className="mt-1 text-xs text-slate-500">Tracking links are built from this.</p>
        </div>
        <div>
          <label className="label" htmlFor="defaultThrottlePerMinute">Default send rate (per minute)</label>
          <input id="defaultThrottlePerMinute" name="defaultThrottlePerMinute" type="number" className="input" defaultValue={settings.defaultThrottlePerMinute} min={1} required />
          {fe.defaultThrottlePerMinute && <p className="form-error">{fe.defaultThrottlePerMinute}</p>}
        </div>
        <div>
          <label className="label" htmlFor="retentionDays">Event retention (days)</label>
          <input id="retentionDays" name="retentionDays" type="number" className="input" defaultValue={settings.retentionDays} min={0} required />
          {fe.retentionDays && <p className="form-error">{fe.retentionDays}</p>}
          <p className="mt-1 text-xs text-slate-500">Raw events older than this are deleted daily. 0 = keep indefinitely.</p>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="reportEmail">Report inbox <span className="text-slate-400">(optional)</span></label>
          <input id="reportEmail" name="reportEmail" type="email" className="input" defaultValue={settings.reportEmail ?? ""} placeholder="security@acme-corp.example" />
          {fe.reportEmail && <p className="form-error">{fe.reportEmail}</p>}
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
