# Phlare

**A self-hosted phishing-simulation & security-awareness training platform for SMEs.**

Phlare is the practical artifact for the Bachelor of Engineering (Informatyka)
thesis *"Design and Evaluation of a Web-Based Phishing Simulation Platform for
Security Awareness Training."* It lets a small or medium enterprise run
controlled, **authorised** phishing simulations against its own staff and — the
distinguishing feature — delivers **just-in-time micro-learning** the moment an
employee clicks or submits, explaining the exact red flags they missed.

> ⚠️ **Authorised defensive training only.** Phlare is a teaching tool. It never
> captures real credentials, ships only generic/fictional templates, and
> requires the admin to affirm authorisation before any campaign launches. See
> [`docs/security.md`](docs/security.md).

---

## What makes it different

- **Built-in content library + just-in-time learning** — unlike Gophish, Phlare
  ships with templates *and* teaches at the moment of failure.
- **One-command deployment** — `docker compose up` brings up the whole stack.
- **Transparent, explainable risk scoring** — a documented formula, not a black box.
- **Psychological-principle tagging** — every template is tagged with the
  Cialdini principle it exercises, tying the tool to the social-engineering theory.

---

## Tech stack

| Concern | Choice |
|---|---|
| Web app | Next.js 15 (App Router) + TypeScript + Tailwind CSS |
| Database | PostgreSQL + Prisma ORM |
| Background jobs | BullMQ + Redis (separate worker process) |
| Auth | Server-side sessions, argon2id hashing, httpOnly cookies |
| Mail | Nodemailer + Mailpit (local mail-catcher for the demo) |
| Charts / export | Recharts; Playwright print-to-PDF + CSV |
| Validation | Zod |

Rationale for each choice is in [`docs/architecture.md`](docs/architecture.md)
and [`DECISIONS.md`](DECISIONS.md).

---

## Quick start (Docker — recommended)

Requirements: Docker Desktop (or Docker Engine + Compose).

```bash
# 1. Configure
cp .env.example .env
# Generate the two required secrets and paste them into .env:
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('APP_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# 2. Launch the whole stack (app, worker, postgres, redis, mailpit)
docker compose up -d --build

# 3. Open the app and complete the first-run setup wizard
#    App:        http://localhost:3000
#    Mailpit UI: http://localhost:8025
```

The `web` container automatically applies database migrations on start.

## Local development

Requirements: Node.js 20.19+, Docker (for Postgres/Redis/Mailpit).

```bash
npm install
cp .env.example .env            # then fill in the two secrets as above

# Start only the backing services in containers:
docker compose up -d postgres redis mailpit

npm run prisma:migrate          # create/apply the database schema
npm run dev                     # Next.js app on http://localhost:3000
npm run worker:dev              # background worker (separate terminal)
```

Then visit http://localhost:3000 and complete the setup wizard.

---

## Useful scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run worker:dev` | Background worker (watch mode) |
| `npm run prisma:migrate` | Apply DB migrations (dev) |
| `npm run db:seed` | Seed deterministic demo data |
| `npm run diagrams` | Regenerate all thesis figures (PNG + SVG) from source |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) |

---

## Documentation (thesis deliverables)

| Document | Maps to thesis chapter |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | Architecture & technology choices |
| [`docs/database-schema.md`](docs/database-schema.md) | Data model + ERD |
| [`docs/diagrams/`](docs/diagrams/) | All figures (source + exported PNG/SVG) |
| [`docs/security.md`](docs/security.md) | Ethical & security considerations |
| [`docs/risk-scoring.md`](docs/risk-scoring.md) | Risk-scoring formula (engineering calculation) |
| [`docs/evaluation.md`](docs/evaluation.md) | Functional test plan & demo harness |
| [`DECISIONS.md`](DECISIONS.md) | Design-decision log & trade-offs |

---

## Build status

Phlare is built in **independently runnable phases**. See `DECISIONS.md` for the
running log.

- ✅ **Phase 1 — Foundation**: project scaffold, first-run setup wizard,
  session-based authentication (argon2id, lockout), PostgreSQL via Prisma,
  background-worker process, and the one-command Docker stack with Mailpit.
- ✅ **Phase 2 — Recipients & groups**: recipient CRUD with soft-delete,
  search/department/group filters, group membership, and CSV import (column
  mapping, per-row report, email-idempotent, reactivation of soft-deleted).
- ✅ **Phase 3 — Content & delivery**: email-template and landing-page CRUD with
  HTML editor + live preview, server-side sanitisation, strict whitelisted
  personalisation, SMTP sending profiles (encrypted at rest) with a Mailpit
  test-send, and a built-in starter content library.
- ⏳ Phase 4 — Campaign engine + tracking
- ⏳ Phase 5 — Just-in-time learning + quiz
- ⏳ Phase 6 — Analytics, exports, risk scoring
- ⏳ Phase 7 — Hardening, tests, seed/demo harness

---

## License & use

For academic and authorised internal training use only. Do not use Phlare to
target individuals or organisations without explicit authorisation.
