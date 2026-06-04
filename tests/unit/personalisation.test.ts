import { describe, it, expect } from "vitest";
import {
  renderPersonalisation,
  PERSONALISATION_VARIABLES,
} from "@/lib/personalization";

describe("renderPersonalisation", () => {
  const values = { firstName: "Jordan", company: "Acme Corp", email: "j@x.example" };

  it("substitutes known variables", () => {
    expect(renderPersonalisation("Hi {{firstName}} at {{company}}", values)).toBe(
      "Hi Jordan at Acme Corp"
    );
  });

  it("leaves unknown tokens literal (no template injection)", () => {
    expect(renderPersonalisation("{{firstName}} {{unknown}} {{__proto__}}", values)).toBe(
      "Jordan {{unknown}} {{__proto__}}"
    );
  });

  it("never evaluates expressions inside tokens", () => {
    expect(renderPersonalisation("{{ 7*7 }} {{constructor}}", values)).toBe(
      "{{ 7*7 }} {{constructor}}"
    );
  });

  it("renders a missing-but-whitelisted variable as empty", () => {
    expect(renderPersonalisation("[{{lastName}}]", values)).toBe("[]");
  });

  it("exposes exactly the documented whitelist", () => {
    expect([...PERSONALISATION_VARIABLES].sort()).toEqual(
      ["company", "department", "email", "firstName", "lastName", "trackingLink"].sort()
    );
  });
});
