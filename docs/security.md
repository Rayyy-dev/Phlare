# Security & Ethical Considerations

Maps to the thesis chapter on ethical and legal considerations. Phlare is a
**defensive** training tool; these are hard requirements, not optional extras.

## 1. Ethical invariants

| # | Requirement | How Phlare enforces it |
|---|---|---|
| 1 | **No real credential capture** | ✅ Live: the submit route (`t/s/[token]`) reads only `formData().keys()` (field **names**) and records those; the typed values are never read, stored, or logged. Verified end-to-end (a planted password value appears nowhere in the database). |
| 2 | **Authorization gate** | ✅ Live: a campaign cannot launch until the admin affirms authorisation; the acknowledgement (`authorizationAck`, `authorizedBy`, `authorizedAt`) is recorded and a launch without it is refused. |
| 3 | **Clear simulation disclosure** | ✅ Live: every teachable-moment page states it was an authorised internal security-awareness exercise and that nothing typed was stored. |
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
| **IDOR on tracking** | 32-byte base64url unguessable tokens, unique per target; no sequential IDs in public URLs; unknown/expired tokens return generic responses (no enumeration hint). ✅ Phase 4 |
| **XSS** (template/landing HTML) | Server-side sanitisation (`sanitize-html`) before store and before render; script/style/iframe/form dropped; strict whitelisted personalisation variables — unknown `{{tokens}}` are left literal, never evaluated (no template injection). ✅ Phase 3 |
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
