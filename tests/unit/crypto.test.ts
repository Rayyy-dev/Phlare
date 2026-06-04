import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret } from "@/server/crypto/encryption";

describe("AES-256-GCM secret encryption", () => {
  it("round-trips a value", () => {
    const secret = "smtp-p@ssw0rd!";
    expect(decryptSecret(encryptSecret(secret))).toBe(secret);
  });

  it("produces different ciphertext each time (random IV)", () => {
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("uses the iv:tag:ciphertext format", () => {
    expect(encryptSecret("x").split(":")).toHaveLength(3);
  });

  it("rejects tampered ciphertext (GCM integrity)", () => {
    const enc = encryptSecret("secret");
    const [iv, tag, data] = enc.split(":");
    const flipped = data.slice(0, -1) + (data.endsWith("a") ? "b" : "a");
    expect(() => decryptSecret(`${iv}:${tag}:${flipped}`)).toThrow();
  });
});
