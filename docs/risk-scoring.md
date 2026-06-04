# Risk Scoring

A transparent, explainable per-recipient risk score derived from event history.
The score is deliberately a **documented formula**, not a machine-learning black
box, so it is defensible as an engineering calculation and understandable by a
non-technical admin.

> Status: formula specified here in Phase 1; computed and surfaced in the
> "highest-risk individuals" view in Phase 6. The `recipients.riskScore` column
> caches the latest value (refreshed by the worker).

## Inputs

For each recipient, across all campaigns they were targeted in, we take the
**most severe outcome per campaign** (a single click and submit in one campaign
count once, as a submission), then apply time decay and training credit.

## Weights

| Outcome (per campaign) | Base points |
|---|---|
| Submitted data | 10 |
| Clicked link | 5 |
| Opened only | 1 |
| No interaction | 0 |
| Reported the email (good behaviour) | −4 |
| Completed training quiz (good behaviour) | −3 |

Positive behaviours (reporting, completing training) reduce the score, rewarding
the outcomes the programme wants to encourage.

## Time decay

Older behaviour matters less. Each campaign's contribution is multiplied by an
exponential decay with a **90-day half-life**:

```
decay(ageDays) = 0.5 ^ (ageDays / 90)
```

So a click 90 days ago contributes half of a click today.

## Aggregation & normalisation

```
raw = Σ_campaigns  ( outcomePoints + behaviourAdjustment ) × decay(ageDays)
score = clamp( round( 100 × raw / (raw + K) ), 0, 100 )     # K = 20, a soft scale
```

The `raw → 0..100` mapping uses a saturating function so that a few bad outcomes
move the score meaningfully while it asymptotically approaches 100 for repeat,
recent, high-severity behaviour. `K` is a tunable constant (default 20).

## Worked example

A recipient who **submitted** in a campaign 30 days ago and **opened** another 120
days ago, with no training:

```
submit:  10 × 0.5^(30/90)  = 10 × 0.794 = 7.94
open:     1 × 0.5^(120/90) =  1 × 0.397 = 0.40
raw = 8.34
score = round(100 × 8.34 / (8.34 + 20)) = round(29.4) = 29
```

After completing a training quiz today (−3, decay ≈ 1):

```
raw = 8.34 − 3 = 5.34
score = round(100 × 5.34 / 25.34) = 21
```

— the score drops, reflecting the mitigation.

## Repeat clickers

A separate "repeat clicker" flag (clicked/submitted in ≥ 2 distinct campaigns)
surfaces persistently high-risk individuals independently of the numeric score,
for targeted follow-up training (Phase 6).

*All parameters (weights, half-life, K) are constants in one module so they are
easy to inspect, tune, and cite.*
