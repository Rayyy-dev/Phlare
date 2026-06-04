import { describe, it, expect } from "vitest";
import { parseCsv, autoDetectMapping } from "@/lib/csv";
import { toCsv } from "@/lib/csv-export";

describe("parseCsv", () => {
  it("parses headers and rows", () => {
    const { headers, rows } = parseCsv("a,b,c\n1,2,3\n4,5,6");
    expect(headers).toEqual(["a", "b", "c"]);
    expect(rows).toEqual([["1", "2", "3"], ["4", "5", "6"]]);
  });

  it("handles quoted fields with commas and escaped quotes", () => {
    const { rows } = parseCsv('name,note\n"Doe, Jane","said ""hi"""');
    expect(rows[0]).toEqual(["Doe, Jane", 'said "hi"']);
  });

  it("handles CRLF and a UTF-8 BOM, and skips blank lines", () => {
    const { headers, rows } = parseCsv("﻿a,b\r\n1,2\r\n\r\n");
    expect(headers).toEqual(["a", "b"]);
    expect(rows).toEqual([["1", "2"]]);
  });

  it("never throws on malformed input", () => {
    expect(() => parseCsv('"unterminated,quote\n')).not.toThrow();
  });
});

describe("autoDetectMapping", () => {
  it("maps common header spellings to recipient fields", () => {
    const m = autoDetectMapping(["First Name", "surname", "E-mail", "dept", "job title"]);
    expect(m.firstName).toBe("First Name");
    expect(m.lastName).toBe("surname");
    expect(m.email).toBe("E-mail");
    expect(m.department).toBe("dept");
    expect(m.position).toBe("job title");
  });
});

describe("toCsv", () => {
  it("quotes fields containing commas, quotes, or newlines", () => {
    const csv = toCsv(["a", "b"], [["x,y", 'q"z']]);
    expect(csv).toBe('a,b\r\n"x,y","q""z"');
  });
});
