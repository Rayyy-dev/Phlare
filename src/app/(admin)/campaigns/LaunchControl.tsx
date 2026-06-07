"use client";

import { useActionState } from "react";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { launchCampaignAction, type LaunchState } from "./actions";

const empty: LaunchState = {};

/**
 * The authorisation gate (Section 7.2). A campaign cannot be launched until the
 * admin explicitly affirms they are authorised to test these recipients; the
 * acknowledgement is recorded server-side.
 */
export function LaunchControl({ campaignId, scheduled }: { campaignId: string; scheduled: boolean }) {
  const [state, run, pending] = useActionState(launchCampaignAction, empty);

  return (
    <form action={run} className="space-y-4">
      <input type="hidden" name="id" value={campaignId} />
      {state.error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3.5 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <span className="space-y-2">
          <span className="block font-semibold">Authorisation required</span>
          <span className="flex items-start gap-2">
            <input type="checkbox" name="ack" className="mt-0.5 h-4 w-4 shrink-0 accent-amber-600" />
            <span>
              I confirm I am <strong>authorised</strong> to run this phishing
              simulation against these recipients within my own organisation, for
              security-awareness training.
            </span>
          </span>
        </span>
      </label>
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Launching…" : scheduled ? "Schedule campaign" : "Launch campaign now"}
      </button>
    </form>
  );
}
