# Breaking Changes & Frontend Coordination Log

> Living document. Every API-visible change made during the refactor is recorded here with before/after details so the frontend (hambaar-app/frontend) can be updated in sync.

**Format:** each entry lists affected endpoints, the change, and required frontend action.

---

## Phase 1 — Foundation (no API changes)

Phase 1 touches tooling, tests, and internal helpers only.

| # | Change | API-visible? | Frontend action |
|---|---|---|---|
| 1.1 | Removed `moment` dependency; `getDateDifference` (used by dashboard "age" strings) now uses `date-fns` calendar math | No (internal formatting; output format unchanged: `X سال و Y ماه`) | None |
| 1.2 | OTP `generateCode` range fix is **not** applied in Phase 1 (deferred to Phase 3 with its own entry) | — | — |

---

## Phase 2 — Bootstrap, Config & Security (applied)

| # | Change | API-visible? | Frontend action |
|---|---|---|---|
| 2.1 | CORS now requires explicit `CORS_ORIGINS` — requests from unlisted origins are blocked (default: all blocked) | Yes | Provide frontend origin(s) to backend env |
| 2.2 | Validation 400s: unknown body fields now rejected (`forbidNonWhitelisted`) | Yes | Do not send fields not in the DTOs |
| 2.3 | `API_PREFIX` (default `api`) — all routes now under `/api/…` | Yes | Update API base URL |
| 2.4 | Swagger disabled in production | No | (n/a) |
| 2.5 | Global rate limiter returns 429 beyond `THROTTLE_LIMIT` per `THROTTLE_TTL` | Yes | Respect 429 + `Retry-After` |

---

## Pending (specified in phase docs, not yet applied)

Each remaining phase doc contains its own detailed breaking-changes section; the consolidated frontend digest is finalized in Phase 6. Headline items already specified:
- **Phase 4 (4.1):** tracking endpoint drops/masks `sender.phoneNumber` — **pending** (Task 5 not started).
- **Phase 5 (5.1–5.2):** support verification 404 when status missing; upload size limit enforced.

> Rule: entries move from "pending (specified)" to "applied" **with the phase that lands them**.

---

## Phase 4 — Core Business (partial: Task 1 + Task 2, no API change)

| # | Change | API-visible? | Frontend action |
|---|---|---|---|
| 4.0 | `TransactionRunner` + pricing engine/strategies refactor landed 2026-09-04 — pricing output byte-identical by golden parity, runner internal only | No | None |
| 4.1 | Tracking PII mask (`sender.phoneNumber`) — **not yet applied** | — (pending) | — |
| 4.2 | Pricing byte-identical guarantee — holds for the partial landing | No | None — report any drift as a bug |

---

## Phase 3 — Auth, Session & User Domain (applied)

| # | Change | API-visible? | Frontend action |
|---|---|---|---|
| 3.1 | OTP is now **6 digits** (was 5) and zero-padded; `code` in `POST /auth/check-otp` is now a 6-digit **string** (was a 5-digit number) | Yes | Update SMS/template expectations; OTP input UI must accept 6 digits; send `code` as string |
| 3.2 | `JWT_*_EXPIRES_IN` envs now configurable — defaults unchanged (`20d/20m/1d`) | No (only if envs changed) | none |
| 3.3 | Session `userState` write for vehicle registration happens inside the service (same end state) | No (behavior parity) | none |
| 3.4 | Guard files re-exports only — no API change | No | none |
