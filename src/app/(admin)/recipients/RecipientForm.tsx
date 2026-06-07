"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createRecipientAction,
  updateRecipientAction,
  reactivateRecipientAction,
  type RecipientFormState,
} from "./actions";

interface RecipientDefaults {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  department?: string | null;
  position?: string | null;
}

const empty: RecipientFormState = {};

export function RecipientForm({
  mode,
  recipient,
  onSuccess,
  onCancel,
}: {
  mode: "create" | "edit";
  recipient?: RecipientDefaults;
  /** Called after a successful create/reactivate (used to close the modal). */
  onSuccess?: () => void;
  /** When provided, Cancel calls this instead of navigating to the list. */
  onCancel?: () => void;
}) {
  const primaryAction =
    mode === "edit" ? updateRecipientAction : createRecipientAction;
  const [state, runPrimary, pending] = useActionState(primaryAction, empty);
  const [reactState, runReactivate, reactPending] = useActionState(
    reactivateRecipientAction,
    empty
  );

  // Close the modal once the server confirms the create/reactivate succeeded.
  useEffect(() => {
    if (state.ok || reactState.ok) onSuccess?.();
  }, [state.ok, reactState.ok, onSuccess]);

  // Controlled so the reactivation form can resubmit the same values the admin
  // already typed without re-entering them.
  const [fields, setFields] = useState({
    firstName: recipient?.firstName ?? "",
    lastName: recipient?.lastName ?? "",
    email: recipient?.email ?? "",
    department: recipient?.department ?? "",
    position: recipient?.position ?? "",
  });
  const set = (k: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  const fe = { ...(state.fieldErrors ?? {}), ...(reactState.fieldErrors ?? {}) };

  return (
    <div className="space-y-4">
      <form action={runPrimary} className="space-y-4" noValidate>
        {mode === "edit" && <input type="hidden" name="id" value={recipient?.id} />}

        {state.error && (
          <div role="alert" className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {state.error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="firstName">First name</label>
            <input id="firstName" name="firstName" className="input" value={fields.firstName} onChange={set("firstName")} required />
            {fe.firstName && <p className="form-error">{fe.firstName}</p>}
          </div>
          <div>
            <label className="label" htmlFor="lastName">Last name</label>
            <input id="lastName" name="lastName" className="input" value={fields.lastName} onChange={set("lastName")} required />
            {fe.lastName && <p className="form-error">{fe.lastName}</p>}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input" value={fields.email} onChange={set("email")} required />
          {fe.email && <p className="form-error">{fe.email}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="department">Department <span className="text-ink-400">(optional)</span></label>
            <input id="department" name="department" className="input" value={fields.department} onChange={set("department")} />
          </div>
          <div>
            <label className="label" htmlFor="position">Position <span className="text-ink-400">(optional)</span></label>
            <input id="position" name="position" className="input" value={fields.position} onChange={set("position")} />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Add recipient"}
          </button>
          {onCancel ? (
            <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          ) : (
            <a href="/recipients" className="btn-secondary">Cancel</a>
          )}
        </div>
      </form>

      {/* Reactivation offer: shown only when the email matches a soft-deleted record. */}
      {state.reactivateId && (
        <form action={runReactivate} className="rounded-md border border-amber-200 bg-amber-50 p-4">
          <input type="hidden" name="reactivateId" value={state.reactivateId} />
          <input type="hidden" name="firstName" value={fields.firstName} />
          <input type="hidden" name="lastName" value={fields.lastName} />
          <input type="hidden" name="email" value={fields.email} />
          <input type="hidden" name="department" value={fields.department} />
          <input type="hidden" name="position" value={fields.position} />
          <p className="mb-3 text-sm text-amber-800">
            Restore the deleted recipient with the details above?
          </p>
          <button type="submit" className="btn-primary" disabled={reactPending}>
            {reactPending ? "Reactivating…" : "Reactivate recipient"}
          </button>
        </form>
      )}
    </div>
  );
}
