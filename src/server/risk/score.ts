/**
 * Transparent, explainable per-recipient risk score.
 *
 * This is a documented engineering calculation, NOT a black box — the full
 * rationale and worked examples live in docs/risk-scoring.md and the constants
 * below are the single source of truth for the formula.
 *
 *   raw   = Σ_participations ( outcomePoints + behaviourAdjustment ) × decay(ageDays)
 *   decay = 0.5 ^ (ageDays / HALF_LIFE_DAYS)            // older behaviour matters less
 *   score = raw ≤ 0 ? 0 : round( 100 × raw / (raw + K) )  // saturating, 0–100
 */
export const RISK_WEIGHTS = { submitted: 10, clicked: 5, opened: 1, none: 0 } as const;
export const REPORTED_ADJUSTMENT = -4; // reporting is good behaviour → lowers risk
export const QUIZ_ADJUSTMENT = -3; // completing training → lowers risk
export const HALF_LIFE_DAYS = 90;
export const SCALE_K = 20;

export type Outcome = keyof typeof RISK_WEIGHTS;

export interface Participation {
  /** Most severe outcome in this campaign for the recipient. */
  outcome: Outcome;
  reported: boolean;
  quizCompleted: boolean;
  /** Days since the recipient was sent this campaign. */
  ageDays: number;
}

export function decay(ageDays: number): number {
  return Math.pow(0.5, Math.max(0, ageDays) / HALF_LIFE_DAYS);
}

export interface RiskResult {
  score: number;
  raw: number;
  participations: number;
}

export function computeRiskScore(parts: Participation[]): RiskResult {
  let raw = 0;
  for (const p of parts) {
    const base = RISK_WEIGHTS[p.outcome];
    const adjustment = (p.reported ? REPORTED_ADJUSTMENT : 0) + (p.quizCompleted ? QUIZ_ADJUSTMENT : 0);
    raw += (base + adjustment) * decay(p.ageDays);
  }
  const score = raw <= 0 ? 0 : Math.min(100, Math.round((100 * raw) / (raw + SCALE_K)));
  return { score, raw, participations: parts.length };
}

/** Derive the single most-severe outcome from a target's first-event markers. */
export function outcomeOf(t: {
  firstSubmittedAt: Date | null;
  firstClickedAt: Date | null;
  firstOpenedAt: Date | null;
}): Outcome {
  if (t.firstSubmittedAt) return "submitted";
  if (t.firstClickedAt) return "clicked";
  if (t.firstOpenedAt) return "opened";
  return "none";
}
