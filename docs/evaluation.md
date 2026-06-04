# Evaluation — Functional Test Plan & Demo Harness

Maps to the thesis results chapter (Chapter 5). The goal is a **repeatable**
end-to-end demonstration that runs a full simulated campaign against synthetic
recipients through the local mail-catcher and produces metrics/screenshots.

> **Synthetic data only.** Every recipient used in the demo/evaluation is
> fictional. Never use real people's data (Section 7.5).

## 1. Test strategy

- **Unit tests** (Vitest) — pure logic: password hashing/verify, session
  hashing/expiry, AES-GCM round-trip, Zod validators, risk-score formula.
- **Integration tests** — API route handlers against a test database.
- **End-to-end** (Playwright) — at least the happy path: setup → login →
  create recipients → build campaign → launch → simulate open/click/submit →
  teachable moment → analytics reflect the events.

## 2. Demo harness

`scripts/demo-campaign.ts` (Phase 7) seeds a fixed set of synthetic recipients,
launches a campaign against Mailpit, drives a deterministic pattern of
open/click/submit/report events, and prints the resulting metrics — so Chapter 5
figures are reproducible.

Mailpit's web UI (http://localhost:8025) shows the delivered simulated emails for
screenshots.

## 3. Functional test cases (tracked per phase)

| ID | Area | Case | Phase | Status |
|---|---|---|---|---|
| F-01 | Setup | First-run wizard creates the initial admin and org | 1 | ✅ |
| F-02 | Setup | Setup is blocked once an admin exists | 1 | ✅ |
| F-03 | Auth | Correct credentials log in; wrong ones are rejected generically | 1 | ✅ |
| F-04 | Auth | Account locks after 5 failed attempts | 1 | ✅ (logic) |
| F-05 | Auth | Unauthenticated access to `/dashboard` redirects to login | 1 | ✅ |
| F-06 | Infra | Worker connects to Redis and all queues report ready | 1 | ✅ |
| F-07 | Infra | `docker compose up` brings up the full stack | 1 | ⏳ verify on deploy |
| F-08 | Recipients | CSV import validates, de-dupes, and reports errors | 2 | ⏳ |
| F-09 | Templates | Personalisation variables render; HTML is sanitised | 3 | ⏳ |
| F-10 | Sending | "Send test email" reaches Mailpit | 3 | ⏳ |
| F-11 | Campaign | Throttled send; pause/stop works | 4 | ⏳ |
| F-12 | Tracking | Open pixel is idempotent; click/submit recorded | 4 | ⏳ |
| F-13 | Ethics | Submitted values are **not** stored (only field names) | 4 | ⏳ |
| F-14 | Learning | Click/submit always lands on the teachable-moment page | 5 | ⏳ |
| F-15 | Analytics | Phish-prone %, rates, time-series, and per-department breakdowns correct | 6 | ✅ |
| F-16 | Export | PDF (Playwright) and CSV reports generate from real events | 6 | ✅ |
| F-17 | Risk | Risk score matches the documented formula | 6 | ✅ |

## 4. Phase 1 verification (performed)

Reproduce locally:

```bash
docker compose up -d postgres redis mailpit
npm run prisma:migrate
npm run build && npm start          # then, in another shell:
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/        # 307 -> /setup
curl -s http://localhost:3000/setup | grep "Welcome to Phlare"                          # wizard renders
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/dashboard # 307 (guarded)
npx tsx src/worker/index.ts          # all three queues report "ready"
```

Observed in Phase 1: routing/guards behave as expected, argon2 auth accepts
correct and rejects wrong credentials, and the worker connects to all queues.
