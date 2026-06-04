import { describe, it, expect } from "vitest";
import { computeRiskScore, decay, type Participation } from "@/server/risk/score";

const p = (over: Partial<Participation>): Participation => ({
  outcome: "none", reported: false, quizCompleted: false, ageDays: 0, ...over,
});

describe("risk score (docs/risk-scoring.md formula)", () => {
  it("is 0 for no participation", () => {
    expect(computeRiskScore([]).score).toBe(0);
  });

  it("scores a single fresh submission (raw 10 -> 100*10/30)", () => {
    expect(computeRiskScore([p({ outcome: "submitted" })]).score).toBe(33);
  });

  it("scores two fresh submissions (raw 20 -> 100*20/40)", () => {
    expect(computeRiskScore([p({ outcome: "submitted" }), p({ outcome: "submitted" })]).score).toBe(50);
  });

  it("orders severity submitted > clicked > opened", () => {
    const s = computeRiskScore([p({ outcome: "submitted" })]).score;
    const c = computeRiskScore([p({ outcome: "clicked" })]).score;
    const o = computeRiskScore([p({ outcome: "opened" })]).score;
    expect(s).toBeGreaterThan(c);
    expect(c).toBeGreaterThan(o);
  });

  it("reporting and quiz completion lower the score (clamped at 0)", () => {
    expect(computeRiskScore([p({ outcome: "opened", reported: true })]).score).toBe(0);
    const withQuiz = computeRiskScore([p({ outcome: "submitted", quizCompleted: true })]).score;
    const without = computeRiskScore([p({ outcome: "submitted" })]).score;
    expect(withQuiz).toBeLessThan(without);
  });

  it("applies a 90-day half-life decay", () => {
    expect(decay(0)).toBeCloseTo(1);
    expect(decay(90)).toBeCloseTo(0.5);
    expect(decay(180)).toBeCloseTo(0.25);
    // submit (10) decayed by half = raw 5 -> 100*5/25 = 20
    expect(computeRiskScore([p({ outcome: "submitted", ageDays: 90 })]).score).toBe(20);
  });

  it("never exceeds 100", () => {
    const many = Array.from({ length: 50 }, () => p({ outcome: "submitted" }));
    expect(computeRiskScore(many).score).toBeLessThanOrEqual(100);
  });
});
