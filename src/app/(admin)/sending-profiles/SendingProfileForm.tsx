"use client";

import { useActionState } from "react";
import { SMTP_SECURITIES } from "@/lib/validation";
import type { SendingProfileView } from "@/server/sending-profiles/service";
import {
  createProfileAction,
  updateProfileAction,
  type ProfileFormState,
} from "./actions";

const empty: ProfileFormState = {};

export function SendingProfileForm({
  mode,
  profile,
}: {
  mode: "create" | "edit";
  profile?: SendingProfileView;
}) {
  const action = mode === "edit" ? updateProfileAction : createProfileAction;
  const [state, run, pending] = useActionState(action, empty);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={run} className="space-y-5" noValidate>
      {mode === "edit" && <input type="hidden" name="id" value={profile?.id} />}
      {state.error && (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      <div>
        <label className="label" htmlFor="name">Profile name</label>
        <input id="name" name="name" className="input" defaultValue={profile?.name} placeholder="Local Mailpit" required />
        {fe.name && <p className="form-error">{fe.name}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="host">SMTP host</label>
          <input id="host" name="host" className="input" defaultValue={profile?.host} placeholder="localhost" required />
          {fe.host && <p className="form-error">{fe.host}</p>}
        </div>
        <div>
          <label className="label" htmlFor="port">Port</label>
          <input id="port" name="port" type="number" className="input" defaultValue={profile?.port ?? 1025} required />
          {fe.port && <p className="form-error">{fe.port}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="security">Security</label>
          <select id="security" name="security" className="input" defaultValue={profile?.security ?? "NONE"}>
            {SMTP_SECURITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="username">Username <span className="text-ink-500">(optional)</span></label>
          <input id="username" name="username" className="input" defaultValue={profile?.username ?? ""} autoComplete="off" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="password">
          Password{" "}
          <span className="text-ink-500">
            {mode === "edit" && profile?.hasPassword
              ? "(leave blank to keep current — encrypted at rest)"
              : "(optional — encrypted at rest)"}
          </span>
        </label>
        <input id="password" name="password" type="password" className="input" autoComplete="new-password"
          placeholder={mode === "edit" && profile?.hasPassword ? "••••••••" : ""} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="fromName">From name</label>
          <input id="fromName" name="fromName" className="input" defaultValue={profile?.fromName} placeholder="IT Helpdesk" required />
          {fe.fromName && <p className="form-error">{fe.fromName}</p>}
        </div>
        <div>
          <label className="label" htmlFor="fromEmail">From email</label>
          <input id="fromEmail" name="fromEmail" type="email" className="input" defaultValue={profile?.fromEmail} placeholder="helpdesk@acme-corp.example" required />
          {fe.fromEmail && <p className="form-error">{fe.fromEmail}</p>}
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : mode === "edit" ? "Save profile" : "Create profile"}
        </button>
        <a href="/sending-profiles" className="btn-secondary">Cancel</a>
      </div>
    </form>
  );
}
