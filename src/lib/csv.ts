import { RECIPIENT_FIELDS, type RecipientField } from "@/lib/validation";

/**
 * A small RFC 4180-style CSV parser. It is intentionally dependency-free and
 * pure (no Node/browser APIs) so the *same* parser produces identical headers
 * on the client (for the column-mapping UI) and on the server (the authoritative
 * import). It handles quoted fields, escaped quotes (`""`), and CRLF/LF.
 *
 * The parser never throws on malformed input — callers validate the resulting
 * rows and report problems per-row instead.
 */
export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

export function parseCsv(text: string): ParsedCsv {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;

  // Strip a UTF-8 BOM if present, so the first header isn't polluted.
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++; // consume the escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      // Treat \r, \n, and \r\n as a single record terminator.
      if (char === "\r" && input[i + 1] === "\n") i++;
      record.push(field);
      records.push(record);
      field = "";
      record = [];
    } else {
      field += char;
    }
  }

  // Flush the trailing field/record if the file doesn't end with a newline.
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  // Drop fully-empty records (e.g. a blank trailing line).
  const nonEmpty = records.filter(
    (r) => !(r.length === 1 && r[0].trim() === "")
  );
  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  const [headers, ...rows] = nonEmpty;
  return { headers: headers.map((h) => h.trim()), rows };
}

// Common header spellings we recognise for each recipient field.
const HEADER_ALIASES: Record<RecipientField, string[]> = {
  firstName: ["firstname", "first name", "first", "given name", "givenname"],
  lastName: ["lastname", "last name", "last", "surname", "family name"],
  email: ["email", "email address", "e-mail", "mail"],
  department: ["department", "dept", "team", "division"],
  position: ["position", "title", "job title", "role", "jobtitle"],
};

/**
 * Best-effort auto-mapping of CSV headers to recipient fields. Returns, for each
 * recipient field, the matching header string (or "" if none was confidently
 * detected). The admin can override any of these in the UI.
 */
export function autoDetectMapping(headers: string[]): Record<RecipientField, string> {
  const normalise = (s: string) => s.toLowerCase().replace(/[_-]+/g, " ").trim();
  const mapping = {} as Record<RecipientField, string>;

  for (const field of RECIPIENT_FIELDS) {
    // Normalise BOTH sides so aliases written with hyphens (e.g. "e-mail") still
    // match a header whose hyphens were turned into spaces during normalisation.
    const aliases = HEADER_ALIASES[field].map(normalise);
    const match = headers.find((h) => aliases.includes(normalise(h)));
    mapping[field] = match ?? "";
  }
  return mapping;
}
