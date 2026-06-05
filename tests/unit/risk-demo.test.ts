import { describe, it, expect } from "vitest";
import { computeRiskScore, type Participation } from "@/server/risk/score";

/**
 * Verifies the risk scores cited in the Chapter 5 demo table against the
 * documented formula, using the EXACT demo behaviours (all in one fresh
 * campaign, so ageDays ≈ 0 and decay ≈ 1). Each case is one participation.
 */
const fresh = (over: Partial<Participation>): Participation[] => [
  { outcome: "none", reported: false, quizCompleted: false, ageDays: 0, ...over },
];

describe("demo risk scores match the documented formula", () => {
  it("single submit → 33 (Dan, Gia)", () => {
    expect(computeRiskScore(fresh({ outcome: "submitted" })).score).toBe(33);
  });
  it("submit + quiz → 26 (Ada)", () => {
    expect(computeRiskScore(fresh({ outcome: "submitted", quizCompleted: true })).score).toBe(26);
  });
  it("submit + reported → 23 (Jo)", () => {
    expect(computeRiskScore(fresh({ outcome: "submitted", reported: true })).score).toBe(23);
  });
  it("clicked → 20 (Cara, Kit)", () => {
    expect(computeRiskScore(fresh({ outcome: "clicked" })).score).toBe(20);
  });
  it("clicked + quiz → 9 (Ivy)", () => {
    expect(computeRiskScore(fresh({ outcome: "clicked", quizCompleted: true })).score).toBe(9);
  });
  it("opened only → 5 (Ben/Finn/Hugo/Lee)", () => {
    expect(computeRiskScore(fresh({ outcome: "opened" })).score).toBe(5);
  });
  it("clicked + reported + quiz → 0 (Eve, clamped)", () => {
    expect(computeRiskScore(fresh({ outcome: "clicked", reported: true, quizCompleted: true })).score).toBe(0);
  });
  it("two fresh submits → 50", () => {
    expect(computeRiskScore([
      { outcome: "submitted", reported: false, quizCompleted: false, ageDays: 0 },
      { outcome: "submitted", reported: false, quizCompleted: false, ageDays: 0 },
    ]).score).toBe(50);
  });
});
