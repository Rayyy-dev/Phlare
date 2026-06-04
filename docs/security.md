# Security & Ethical Considerations

Maps to the thesis chapter on ethical and legal considerations. Phlare is a
**defensive** training tool; these are hard requirements, not optional extras.

## 1. Ethical invariants

| # | Requirement | How Phlare enforces it |
|---|---|---|
| 1 | **No real credential capture** | The submit handler records only a `SUBMITTED` event and the **field names** present; typed values are discarded server-side and never logged, stored, or transmitted. Encoded in `schema.prisma` comments and the handler (Phase 4). |
| 2 | **Authorization gate** | A campaign cannot launch until the admin affirms authorisation; the acknowledgement (`authorizationAck`, `authorizedBy`, `authorizedAt`) is recorded (Phase 4). |
| 3 | **Clear simulation disclosure** | Every teachable-moment page states it was an authorised internal exercise (Phase 5). |
| 4 | **Generic, non-branded templates** | The seeded library uses fictional brands ("Acme Corp / IT Helpdesk"); no real logos or trademarked login clones (Phase 3). |
| 5 | **Data minimisation & retention** | Only analytics-necessary data is collected; `userAgent` truncated, IP coarse/optional; configurable `retentionDays` with a scheduled cleanup job (Phases 4/7). |
| 6 | **The platform itself is secure** | See §2. |
| 7 | **Audit logging** | Sensitive admin actions recorded in `audit_log` with actor + timestamp. |

## 2. Application-security threat model (web)

| Threat | Mitigation (status) |
|---|---|
| **Broken auth / brute force** | argon2id hashing; login lockout after 5 fails / 15 min; constant-time dummy verify to avoid user enumeration. ✅ Phase 1 |
| **Session theft** | httpOnly + SameSite=Lax + Secure (prod) cookies; only `sha256(token)` stored, so a DB leak can't reconstruct cookies; instant server-side revocation. ✅ Phase 1 |
| **Secrets at rest** | SMTP passwords AES-256-GCM encrypted; app secrets in `.env`, never committed. ✅ Phase 1 |
| **IDOR on tracking** | 32-byte unguessable tokens; no sequential IDs in public URLs. ✅ schema; endpoints Phase 4 |
| **XSS** (template/landing HTML) | Server-side sanitisation (isomorphic-DOMPurify) before rendering; strict whitelisted personalisation variables (no template injection). ⏳ Phase 3 |
| **SQL injection** | Prisma parameterised queries throughout. ✅ |
| **CSRF** | SameSite cookies + same-origin Server Actions; explicit origin checks on state-changing routes. ✅/⏳ |
| **Clickjacking / sniffing** | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`. ✅ Phase 1 |
| **Input validation** | Zod schemas on all inputs, shared client/server. ✅ (grows per phase) |

## 3. Key management

`APP_ENCRYPTION_KEY` (32 bytes, hex) encrypts SMTP credentials; `SESSION_SECRET`
protects session material. Both are operator-supplied via `.env`, must be unique
per deployment, and must never be committed. Rotating `APP_ENCRYPTION_KEY`
requires re-encrypting stored SMTP passwords (re-enter them).

## 4. GDPR awareness (EU/UK context)

Recipient data stays in the organisation's own deployment (self-hosted, no
external SaaS). Data minimisation and a configurable retention period support
storage-limitation and minimisation principles. The audit log supports
accountability. Only synthetic/fictional data is used in the demo and tests.

*Sections marked ⏳ are completed in the noted phase; this document is updated as
each lands.*
