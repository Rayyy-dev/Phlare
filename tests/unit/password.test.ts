import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/server/auth/password";

describe("argon2id password hashing", () => {
  it("verifies the correct password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword(hash, "correct horse battery staple")).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword(hash, "wrong password")).toBe(false);
  });

  it("produces an argon2id hash and never the plaintext", async () => {
    const hash = await hashPassword("plaintext-secret");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(hash).not.toContain("plaintext-secret");
  });

  it("returns false (does not throw) on a malformed hash", async () => {
    expect(await verifyPassword("not-a-hash", "anything")).toBe(false);
  });
});
