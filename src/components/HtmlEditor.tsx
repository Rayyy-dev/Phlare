"use client";

import { useState } from "react";
import { renderPersonalisation, samplePersonalisation } from "@/lib/personalization";

/**
 * HTML body editor with a live preview. The textarea carries the form field
 * (`name`), so the raw HTML is submitted and sanitised server-side on save.
 *
 * The preview substitutes sample personalisation values and renders inside a
 * sandboxed iframe with NO `allow-scripts`, so even un-sanitised markup in the
 * draft cannot execute while editing. Authoritative sanitisation still happens
 * on the server before the HTML is stored.
 */
export function HtmlEditor({
  name,
  defaultValue = "",
  company = "Acme Corp",
  personalise = true,
}: {
  name: string;
  defaultValue?: string;
  company?: string;
  personalise?: boolean;
}) {
  const [html, setHtml] = useState(defaultValue);
  const preview = personalise
    ? renderPersonalisation(html, samplePersonalisation(company))
    : html;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <label className="label" htmlFor={name}>HTML</label>
        <textarea
          id={name}
          name={name}
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          spellCheck={false}
          className="input min-h-80 font-mono text-xs"
        />
      </div>
      <div>
        <span className="label">Preview</span>
        <iframe
          title="Preview"
          sandbox=""
          srcDoc={preview}
          className="min-h-80 w-full rounded-md border border-slate-300 bg-white"
        />
      </div>
    </div>
  );
}
