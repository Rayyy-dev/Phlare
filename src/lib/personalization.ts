/**
 * Strict, whitelisted personalisation.
 *
 * Templates may reference only the fixed set of variables below using
 * `{{variable}}` syntax. Substitution is a plain string replacement of those
 * exact tokens — there is NO expression language, no property access, and no
 * code execution. Any `{{...}}` that is not in the whitelist is left untouched
 * (literal), so a malformed or hostile token can never be evaluated. This is a
 * deliberate defence against template-injection (docs/security.md).
 *
 * Pure and dependency-free, so the same renderer runs in the editor preview
 * (client) and when an email is actually built (server, Phase 4).
 */
export const PERSONALISATION_VARIABLES = [
  "firstName",
  "lastName",
  "email",
  "department",
  "trackingLink",
  "company",
] as const;

export type PersonalisationVariable = (typeof PERSONALISATION_VARIABLES)[number];
export type PersonalisationValues = Partial<Record<PersonalisationVariable, string>>;

const TOKEN = /\{\{\s*(\w+)\s*\}\}/g;
const ALLOWED = new Set<string>(PERSONALISATION_VARIABLES);

export function renderPersonalisation(
  template: string,
  values: PersonalisationValues
): string {
  return template.replace(TOKEN, (match, name: string) => {
    if (!ALLOWED.has(name)) return match; // unknown token → leave literal
    return values[name as PersonalisationVariable] ?? "";
  });
}

/** Representative values used to render the live editor preview. */
export function samplePersonalisation(company: string): PersonalisationValues {
  return {
    firstName: "Jordan",
    lastName: "Reyes",
    email: "jordan.reyes@acme-corp.example",
    department: "Finance",
    trackingLink: "https://phlare.example/t/c/sample-token",
    company,
  };
}
