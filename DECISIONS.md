# Design Decisions Log

A running record of notable design decisions and trade-offs, kept so the
rationale can be lifted into the thesis (in the author's own words). Each entry:
**context → decision → rationale → trade-offs / alternatives rejected.**

---

## D1 — Monolithic Next.js app + a separate worker process (not microservices)

**Context.** The platform needs an admin UI, public tracking endpoints, and
long-running background sending.

**Decision.** One Next.js (App Router) application serves the admin UI, the API
route handlers, and the public tracking routes. A **separate worker process**
(same codebase/image, started with `tsx src/worker/index.ts`) consumes the
BullMQ queues for sending and scheduled launches.

**Rationale.** Request/response work (CRUD, the tracking pixel/click/submit) fits
HTTP handlers. Email sending and scheduled launches are long-running and must not
block or time out an HTTP request, so they belong in a dedicated process. Sharing
one codebase keeps the model/Prisma client and types consistent and keeps the
deployment to two simple containers.

**Trade-offs.** A true microservice split would scale components independently
but adds operational complexity unjustified for an SME single-node deployment.

---

## D2 — Server-side sessions over JWT

**Context.** Admins (the only authenticated role) need login sessions.

**Decision.** Stateful sessions stored in PostgreSQL. The cookie carries a
32-byte random token; the DB stores only its SHA-256 hash as the primary key.
Cookies are `httpOnly`, `SameSite=Lax`, and `Secure` in production.

**Rationale.** Self-hosted single-node deployment doesn't need JWT's stateless
horizontal-scaling benefit. Sessions give **instant revocation** (logout,
lockout, deactivation), a simpler CSRF posture, and storing only the token hash
means a DB leak cannot reconstruct a live cookie. This is easy to defend at the
thesis defence.

**Trade-offs.** A DB read per authenticated request — negligible at this scale,
and mitigated by a sliding-expiry refresh rather than a write on every request.

**Alternatives rejected.** JWT (revocation is hard); third-party auth providers
(violates the self-hosted/data-sovereignty principle).

---

## D3 — argon2id for password hashing

**Decision.** argon2id (64 MiB, 3 iterations, parallelism 1).

**Rationale.** Current OWASP-recommended, memory-hard algorithm; resists
GPU/ASIC cracking better than bcrypt. A constant-time dummy verification is run
for unknown emails so login timing does not reveal which emails exist.

**Trade-offs.** Higher CPU/memory per login than bcrypt — acceptable for an
admin-only login path.

---

## D4 — BullMQ + Redis for background jobs

**Decision.** BullMQ (on Redis) for the send, schedule, and retention queues.

**Rationale.** Provides delayed jobs (scheduled launches), automatic retries,
and a **built-in rate limiter** that directly implements the campaign
send-throttling requirement. Redis is a light dependency already common in the
ecosystem.

**Trade-offs.** Adds Redis to the stack. A DB-polling scheduler would avoid it
but reimplements retries/rate-limiting/delays poorly. Note: we pass BullMQ plain
connection *options* (not a shared ioredis instance) to avoid a type/version
clash between BullMQ's bundled ioredis and a top-level one.

---

## D5 — PostgreSQL + Prisma

**Decision.** PostgreSQL via Prisma ORM.

**Rationale.** Relational integrity fits the strongly-related domain (campaigns,
targets, events). Prisma gives typed queries, migrations, and — via
`prisma-erd-generator` — an ERD that is generated straight from the schema and
therefore can never drift from the real model.

---

## D6 — Unguessable tracking tokens + denormalised first-event timestamps

**Decision.** Each `CampaignTarget` has a 32-byte base64url `trackingToken`.
`CampaignTarget` also stores `firstOpenedAt` / `firstClickedAt` /
`firstSubmittedAt` / `reportedAt`.

**Rationale.** Random tokens prevent enumeration/IDOR of other recipients'
tracking links. The denormalised "first occurrence" markers make event recording
**idempotent** (a pixel loaded twice is still one "open") and make phish-prone-%
analytics index-friendly without scanning the full events table.

**Trade-offs.** Slight write-time bookkeeping; the full event history is still
kept in `events` for time-series analysis.

---

## D7 — No real credential capture (hard ethical invariant)

**Decision.** When a recipient submits the fake form, the server records only a
`SUBMITTED` event and the **field names** that were present — never the values
typed. Values are discarded immediately server-side.

**Rationale.** This is the central ethical requirement: a defensive training tool
must not become a working credential harvester. Encoded in the schema comments
and enforced at the submission handler (Phase 4).

---

## D8 — AES-256-GCM for SMTP credentials at rest

**Decision.** SMTP passwords are encrypted with AES-256-GCM (`iv:tag:ciphertext`)
using `APP_ENCRYPTION_KEY`.

**Rationale.** GCM gives confidentiality *and* integrity (tampering is detected).
Credentials must not sit in plaintext in the DB. Key management is the operator's
responsibility, documented in `docs/security.md`.

---

## D9 — Diagrams as committed source rendered to PNG + SVG

**Decision.** All thesis figures live as Mermaid sources in `docs/diagrams/` and
are rendered by `npm run diagrams` to print-resolution PNG (scale 3 ≈ 300 DPI)
and SVG with one shared `neutral` theme. The ERD is generated from
`schema.prisma`.

**Rationale.** Keeping figure *sources* in the repo means every diagram stays
consistent with the system and with each other, and can be re-exported on demand.
The shared greyscale-friendly theme keeps figures legible in black-and-white
print; titles/captions are intentionally **not** burned into images (they live in
the thesis text).

**Trade-offs.** Rendering needs a headless browser (via mermaid-cli), so it is a
dev-time step, deliberately excluded from the Docker build (the ERD generator
emits Mermaid markdown there, not an image).

---

## D10 — Soft-delete reactivation instead of a partial unique index

**Context.** `Recipient.email` and `Group.name` are plain `@unique` columns, but
records are soft-deleted (`deletedAt`). We want uniqueness only among *active*
records — a value freed by a soft delete should be reusable — which a plain
unique constraint does not allow, and Postgres cannot express as a partial
unique index through Prisma's schema.

**Decision.** Resolve it in the application layer. When an admin adds an email
(or group name) that matches a **soft-deleted** record, we do not error: we offer
to **reactivate** that record (clear `deletedAt`, overwrite its fields) rather
than create a duplicate. A match against an **active** record is still rejected
as a duplicate. CSV import applies the same rule automatically (soft-deleted
matches are reactivated; active matches are skipped or updated).

**Rationale.** Keeps the schema simple and portable while giving the intended
"unique among active" semantics and a friendly recovery path. The single unique
constraint still guarantees there is at most one row per email/name to reactivate.

**Trade-offs.** Uniqueness is enforced by code on the write paths rather than by
the database alone; all create/import paths funnel through the service layer so
the rule is applied consistently.

## D11 — `sanitize-html` instead of isomorphic-dompurify

**Context.** Phase 1 planned isomorphic-dompurify for HTML sanitisation. In
Phase 3 it broke the Next.js server build: it pulls in `jsdom`, whose transitive
`@csstools/css-calc` is ESM-only and cannot be `require()`d by Next's server
bundle (`ERR_REQUIRE_ESM`).

**Decision.** Sanitise with **`sanitize-html`** — a pure-JS, parser-based
sanitiser with no `jsdom` dependency.

**Rationale.** Same defensive purpose (drop `<script>`, event handlers,
`javascript:` URLs, and unsafe tags), but no headless-DOM dependency, so the
server build stays clean and the image stays lighter. Configured to allow a safe
email/landing tag+attribute set and to preserve a `{{trackingLink}}` placeholder
in hrefs until personalisation runs. Verified: scripts/handlers/`javascript:`
URLs are stripped while the placeholder survives.

**Trade-offs.** `sanitize-html` is parser- rather than DOM-based; its allow-list
is configured explicitly (which is arguably clearer to audit for a thesis).

## D12 — Strict whitelisted personalisation (no template engine)

**Decision.** `{{variable}}` substitution is a plain replacement of a fixed
whitelist of tokens (`firstName`, `lastName`, `email`, `department`,
`trackingLink`, `company`). There is no expression language; unknown tokens are
left literal.

**Rationale.** A real template engine (Handlebars, EJS, etc.) on admin-authored
content is a template-injection surface. A whitelist-only replacement makes
injection impossible by construction and is trivial to reason about at defence.

## D13 — Per-campaign throttling via staggered job delays

**Context.** Each campaign sets its own `throttlePerMinute`. BullMQ's free-tier
rate limiter is **per-worker (global)**, so it cannot enforce a different rate
for each concurrently-running campaign.

**Decision.** Stagger sends with per-job delays: job N is enqueued with a delay
of `N × (60000 / throttlePerMinute)` ms. A 60/min campaign therefore sends one
message per second, independent of other campaigns.

**Rationale.** Gives an accurate, per-campaign send rate using only core BullMQ
features, and stable `jobId`s (`send-<targetId>`) make enqueueing idempotent so
resuming a paused campaign cannot double-send. (`:` is not allowed in BullMQ job
IDs, hence the `-` separator.)

**Trade-offs.** Delays are computed at enqueue time from the launch moment; a
mid-flight throttle change would require re-enqueueing (not needed for the
current scope).

## D14 — Quizzes graded server-side; answer key never sent to the client

**Decision.** The recipient's quiz page receives questions and options only — not
the correct-answer indices. Grading happens server-side in `gradeAndStore`, which
persists only the chosen option **indices** (never free text) on `QuizResult`,
tied to the `CampaignTarget`, and records `QUIZ_COMPLETED` once.

**Rationale.** Keeps the correct answers off the wire (a recipient can't read the
key from page source before answering) and keeps the stored data minimal and
PII-free, consistent with the no-credential-capture stance. One result per
(target, quiz) keeps analytics clean.

## D15 — Retention deletes raw events, keeps aggregates

**Decision.** The daily retention job deletes `Event` rows older than
`Settings.retentionDays` but leaves the denormalised first-event markers and
counts on `CampaignTarget`. `retentionDays = 0` means keep indefinitely.

**Rationale.** Satisfies GDPR storage-limitation (the detailed, timestamped event
log is the most privacy-sensitive data) while preserving historical phish-prone%
and per-recipient aggregates for trend reporting. Pruning aggregates too would
destroy the longitudinal value with little privacy gain (no PII in the counts).

## D16 — Environment-aware CSP; rate limiting on tracking routes

**Decision.** A Content-Security-Policy is sent on every response. `unsafe-eval`
is included **in development only** (Next.js fast-refresh needs it); the
production CSP omits it. Public open-pixel and submit routes are rate-limited
per IP with a generous fixed window.

**Rationale.** Verified that Recharts renders under the strict production CSP
(no `unsafe-eval`) — the eval requirement was purely Next's dev HMR, so shipping
a weaker prod CSP was unnecessary. `unsafe-inline` is still required for scripts
(no nonce pipeline) — documented as the remaining hardening step. The rate-limit
window is deliberately generous so an office behind one NAT egress IP is not
throttled while a campaign lands.

## Phase log

- **Phase 1 (foundation).** Scaffolded the app; implemented the setup wizard,
  session auth with lockout, the Prisma schema (full model, migration `init`),
  the worker process and queue wiring, and the Docker stack with Mailpit.
  Verified end-to-end: routing/guards, argon2 auth, and worker↔Redis.
- **Phase 2 (recipients & groups).** Recipient CRUD with soft-delete and
  search/department/group filters + pagination; group CRUD and membership
  management; CSV import with column mapping, per-row validation, an
  imported/updated/reactivated/skipped/failed report, and email idempotency.
  Email/name uniqueness and reactivation per D10. Every mutation audited. Added
  synthetic seed data (8 recipients, 2 groups). No schema change required.
- **Phase 3 (content & delivery).** Email-template and landing-page CRUD with
  HTML editor + sandboxed live preview, server-side sanitisation (D11), and
  strict whitelisted personalisation (D12). Landing pages store field
  definitions only (never recipient input). Sending-profile CRUD with SMTP
  passwords encrypted at rest (AES-GCM) and a "send test email" through Mailpit
  that records the result; plaintext passwords never returned to the client.
  Seeded 3 built-in templates + 2 landing pages (generic, non-branded). No
  schema change required.
- **Phase 4 (campaign engine & tracking).** Campaign CRUD; mandatory
  authorisation gate before launch (records ack/by/at); lifecycle DRAFT →
  SCHEDULED → RUNNING → COMPLETED with PAUSED/STOPPED. Launch expands groups into
  one CampaignTarget per unique recipient with a 32-byte base64url token. BullMQ
  send pipeline renders personalisation + injects the open pixel and tokenised
  click link, sends via the profile, records SENT, and auto-completes;
  per-campaign throttle via staggered delays (D13); scheduled launches fire
  automatically. Public routes `t/o` (pixel), `t/c` (click→landing), `t/s`
  (submit), `t/report`, `t/learn` — idempotent on first event, graceful on
  unknown tokens. **Ethical invariant now live in code: form submissions record
  field NAMES only; typed values are never read, stored, or logged** (verified
  end-to-end, 23/23 checks). No schema change required.
- **Phase 5 (just-in-time learning & quiz).** Teachable-moment page records
  LEARN_VIEWED and explains the specific red flags from the template plus the
  landing page used. Optional per-campaign knowledge-check quiz: admin quiz
  builder (CRUD), recipient takes it on the teachable page, graded server-side,
  storing chosen indices only + QUIZ_COMPLETED (D14). Seeded one built-in quiz.
  No schema change required. Verified end-to-end (15/15).
- **Phase 6 (analytics, reporting, exports & risk scoring).** Org- and
  campaign-level metrics (delivered, open/click/submit/report rates, phish-prone
  %), a since-launch time-series, per-department breakdown, and repeat-clicker
  flagging — charts with Recharts (greyscale-friendly). Transparent risk score
  (`src/server/risk/`) per docs/risk-scoring.md, cached on `Recipient.riskScore`
  and refreshed by a worker job (debounced after events + periodic, bounded write
  concurrency). CSV export (dependency-free serialiser) and a print-friendly
  report route rendered to PDF via Playwright/Chromium (forwards the admin
  session cookie). No schema change. Verified end-to-end (18/18) — metrics,
  department breakdown, repeat clickers, all three risk scores matching the
  formula, CSV, and a 60 KB PDF.
- **Phase 7 (hardening, tests & demo harness).** CSP/HSTS headers (env-aware,
  D16), per-IP rate limiting on the public tracking routes, and an **implemented**
  data-retention cleanup job (D15) — replacing the earlier stub. Removed the
  unused `Event.ipPrefix` column (migration) so the schema matches the honest
  "IP is never collected" stance. Added a Settings + audit-log admin page
  (closing §5.11). 32 Vitest unit tests and a Playwright end-to-end happy-path
  test; reproducible `npm run demo` harness producing metrics + PDF + screenshots
  (charts render under the strict prod CSP). Dockerfile installs Chromium for the
  PDF route. ERD regenerated. Verified: retention (5/5), unit (32/32), e2e (1/1).
