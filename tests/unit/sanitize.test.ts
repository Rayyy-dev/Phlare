import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "@/server/html/sanitize";

describe("sanitizeHtml (XSS defence)", () => {
  it("removes script tags", () => {
    expect(sanitizeHtml("<p>ok</p><script>alert(1)</script>")).not.toMatch(/<script/i);
  });

  it("strips event-handler attributes", () => {
    expect(sanitizeHtml('<img src="x" onerror="alert(1)">')).not.toMatch(/onerror/i);
  });

  it("removes javascript: URLs", () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toMatch(/javascript:/i);
  });

  it("drops form and iframe elements", () => {
    const out = sanitizeHtml("<form><input></form><iframe src='x'></iframe>");
    expect(out).not.toMatch(/<form|<iframe|<input/i);
  });

  it("preserves a {{trackingLink}} placeholder in href", () => {
    expect(sanitizeHtml('<a href="{{trackingLink}}">Verify</a>')).toContain("{{trackingLink}}");
  });

  it("keeps safe formatting", () => {
    const out = sanitizeHtml("<p><strong>Hi</strong> <a href='https://x.example'>link</a></p>");
    expect(out).toMatch(/<strong>Hi<\/strong>/);
    expect(out).toMatch(/href="https:\/\/x.example"/);
  });
});
