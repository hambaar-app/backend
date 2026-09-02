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

## Pending (specified in phase docs, not yet applied)

Each phase doc contains its own detailed breaking-changes section; the consolidated frontend digest
is finalized in Phase 6. Headline items already specified:

- **Phase 2 (2.1–2.5):** CORS allowlist required; strict body validation; optional `/api` prefix;
  Swagger off in prod; global rate limiter (429).
- **Phase 3 (3.1):** OTP becomes **6 digits** (uniform, zero-padded).
- **Phase 4 (4.1):** tracking endpoint drops/masks `sender.phoneNumber`.
- **Phase 5 (5.1–5.2):** support verification 404 when status missing; upload size limit enforced.

> Rule: entries move from "pending (specified)" to "applied" **with the phase that lands them**.
