"use client";

import { useActionState } from "react";
import { testEmailAction, type TestEmailState } from "./actions";

const empty: TestEmailState = {};

export function TestEmailControl({ profileId }: { profileId: string }) {
  const [state, run, pending] = useActionState(testEmailAction, empty);

  return (
    <form action={run} className="space-y-3">
      <input type="hidden" name="id" value={profileId} />
      <div className="flex items-end gap-2">
        <div className="grow">
          <label className="label" htmlFor="to">Send a test email to</label>
          <input id="to" name="to" type="email" className="input" placeholder="you@example.com" required />
        </div>
        <button type="submit" className="btn-secondary" disabled={pending}>
          {pending ? "Sending…" : "Send test"}
        </button>
      </div>
      {state.message && (
        <p className={`text-sm ${state.ok ? "text-green-700" : "text-red-600"}`}>{state.message}</p>
      )}
    </form>
  );
}
