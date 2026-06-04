"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { parseCsv, autoDetectMapping } from "@/lib/csv";
import { RECIPIENT_FIELDS, type RecipientField } from "@/lib/validation";
import { importAction, type ImportState } from "./actions";

const FIELD_LABELS: Record<RecipientField, string> = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  department: "Department",
  position: "Position",
};
const REQUIRED: RecipientField[] = ["firstName", "lastName", "email"];

export function ImportWizard({ groups }: { groups: { id: string; name: string }[] }) {
  const [state, run, pending] = useActionState<ImportState, FormData>(importAction, {});
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [mapping, setMapping] = useState<Record<RecipientField, string>>(
    {} as Record<RecipientField, string>
  );

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { headers, rows } = parseCsv(text);
    setCsvText(text);
    setFileName(file.name);
    setHeaders(headers);
    setRowCount(rows.length);
    setMapping(autoDetectMapping(headers)); // pre-fill; admin can override
  }

  // After a successful import, show the result report.
  if (state.report) {
    const r = state.report;
    return (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-5">
          {[
            { label: "Total rows", value: r.total },
            { label: "Created", value: r.created },
            { label: "Updated", value: r.updated },
            { label: "Reactivated", value: r.reactivated },
            { label: "Skipped", value: r.skipped },
          ].map((s) => (
            <div key={s.label} className="card text-center">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        {r.failed.length > 0 ? (
          <div className="card p-0">
            <p className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-red-700">
              {r.failed.length} row{r.failed.length === 1 ? "" : "s"} failed
            </p>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr><th className="px-4 py-2">Row</th><th className="px-4 py-2">Email</th><th className="px-4 py-2">Reason</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {r.failed.map((f) => (
                  <tr key={f.row}>
                    <td className="px-4 py-2">{f.row}</td>
                    <td className="px-4 py-2 text-slate-600">{f.email ?? "—"}</td>
                    <td className="px-4 py-2 text-red-600">{f.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
            All rows processed without errors.
          </p>
        )}

        <div className="flex gap-3">
          <Link href="/recipients" className="btn-primary">View recipients</Link>
          <Link href="/recipients/import" className="btn-secondary">Import another file</Link>
        </div>
      </div>
    );
  }

  return (
    <form action={run} className="space-y-6">
      {state.error && (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <label className="label" htmlFor="file">CSV file</label>
        <input id="file" type="file" accept=".csv,text/csv" onChange={onFile} className="block text-sm" />
        {fileName && (
          <p className="mt-1 text-xs text-slate-500">{fileName} — {rowCount} data row{rowCount === 1 ? "" : "s"} detected.</p>
        )}
      </div>

      {headers.length > 0 && (
        <>
          <input type="hidden" name="csvText" value={csvText} />
          <input type="hidden" name="mapping" value={JSON.stringify(mapping)} />

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-slate-600">Map columns</legend>
            {RECIPIENT_FIELDS.map((field) => (
              <div key={field} className="flex items-center gap-3">
                <label className="w-32 text-sm text-slate-700" htmlFor={`map-${field}`}>
                  {FIELD_LABELS[field]}
                  {REQUIRED.includes(field) && <span className="text-red-500"> *</span>}
                </label>
                <select
                  id={`map-${field}`}
                  className="input max-w-xs"
                  value={mapping[field] ?? ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}
                >
                  <option value="">— not mapped —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="groupId">Add all to group <span className="text-slate-400">(optional)</span></label>
              <select id="groupId" name="groupId" className="input">
                <option value="">— none —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
              <input type="checkbox" name="updateExisting" className="h-4 w-4" />
              Update existing recipients that match by email
            </label>
          </div>

          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Importing…" : `Import ${rowCount} row${rowCount === 1 ? "" : "s"}`}
          </button>
        </>
      )}
    </form>
  );
}
