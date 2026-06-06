"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { setupAction, type SetupFormState } from "./actions";

const initialState: SetupFormState = {};

export function SetupForm() {
  const [state, formAction, pending] = useActionState(setupAction, initialState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3.5 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <fieldset className="space-y-4">
        <legend className="text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-400">
          Your administrator account
        </legend>
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" name="name" className="input" autoComplete="name" required />
          {fe.name && <p className="form-error">{fe.name}</p>}
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input" autoComplete="username" required />
          {fe.email && <p className="form-error">{fe.email}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" className="input" autoComplete="new-password" required />
            {fe.password && <p className="form-error">{fe.password}</p>}
          </div>
          <div>
            <label className="label" htmlFor="confirmPassword">Confirm password</label>
            <input id="confirmPassword" name="confirmPassword" type="password" className="input" autoComplete="new-password" required />
            {fe.confirmPassword && <p className="form-error">{fe.confirmPassword}</p>}
          </div>
        </div>
        <p className="text-xs text-ink-500">
          Use at least 12 characters. This is the only account type in Phlare;
          recipients never log in.
        </p>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-400">
          Organisation
        </legend>
        <div>
          <label className="label" htmlFor="orgName">Organisation name</label>
          <input id="orgName" name="orgName" className="input" defaultValue="Acme Corp" required />
          {fe.orgName && <p className="form-error">{fe.orgName}</p>}
        </div>
        <div>
          <label className="label" htmlFor="baseUrl">Public base URL</label>
          <input id="baseUrl" name="baseUrl" type="url" className="input" defaultValue="http://localhost:3000" required />
          <p className="mt-1 text-xs text-ink-500">
            The address recipients reach. Tracking links are built from this.
          </p>
          {fe.baseUrl && <p className="form-error">{fe.baseUrl}</p>}
        </div>
      </fieldset>

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Creating account…" : "Complete setup"}
      </button>
    </form>
  );
}
