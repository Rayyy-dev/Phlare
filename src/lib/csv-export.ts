/**
 * Minimal, dependency-free CSV serialiser (RFC 4180 quoting). Used for the
 * campaign results export. Values containing a comma, quote, or newline are
 * wrapped in quotes with internal quotes doubled.
 */
function cell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: (string | number | boolean | null)[][]): string {
  const lines = [headers.map(cell).join(",")];
  for (const row of rows) lines.push(row.map(cell).join(","));
  return lines.join("\r\n");
}
