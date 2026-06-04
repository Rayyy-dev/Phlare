"use client";

import { useActionState } from "react";
import {
  createGroupAction,
  updateGroupAction,
  type GroupFormState,
} from "./actions";

const empty: GroupFormState = {};

export function GroupForm({
  mode,
  group,
}: {
  mode: "create" | "edit";
  group?: { id: string; name: string; description?: string | null };
}) {
  const action = mode === "edit" ? updateGroupAction : createGroupAction;
  const [state, run, pending] = useActionState(action, empty);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={run} className="space-y-4" noValidate>
      {mode === "edit" && <input type="hidden" name="id" value={group?.id} />}
      {state.error && (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      <div>
        <label className="label" htmlFor="name">Group name</label>
        <input id="name" name="name" className="input" defaultValue={group?.name ?? ""} required />
        {fe.name && <p className="form-error">{fe.name}</p>}
      </div>
      <div>
        <label className="label" htmlFor="description">Description <span className="text-slate-400">(optional)</span></label>
        <textarea id="description" name="description" className="input min-h-20" defaultValue={group?.description ?? ""} />
        {fe.description && <p className="form-error">{fe.description}</p>}
      </div>
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Create group"}
      </button>
    </form>
  );
}
