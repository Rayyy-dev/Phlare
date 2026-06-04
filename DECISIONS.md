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
