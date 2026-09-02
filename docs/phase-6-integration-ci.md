# Phase 6 — Integration Tests, CI & Final Docs

> **Status:** ⬜ Not started · **Spec version:** 1.0 (2026-09-02)
>
> **Audit issues in scope:** O-2 (partial), T-1 (coverage gate), T-5 (dead e2e), T-6 (CI secrets), C-7 (docker/entrypoint), O-3.
> **Depends on:** Phases 1–5 (all code refactored, all unit tests re-implemented).

## 1. Objective

Prove the whole thing end-to-end against **real Postgres + Redis** in CI, turn the 100/95 coverage
targets into an enforced CI gate, retire the scaffold e2e test, update ops files (`entrypoint.sh`,
`Dockerfile`, compose), and finalize documentation including the frontend digest.

---

## 2. Task 1 — Integration test suite (`test/integration/`)

### 2.1 Infrastructure
- `docker-compose.test.yml` — postgres:17 + redis:8 (same images/versions as `docker-compose.dev.yml`),
  no app service; fixed host ports for local runs.
- `test/integration/setup.ts` (Jest `globalSetup`) — sets `DATABASE_URL`/`REDIS_URL`/`SESSION_REDIS_URL`
  to the test services, runs `prisma db push` (schema is unchanged, so no migrations needed), then
  truncates tables between suites via a helper.

### 2.2 Test categories
| Suite | What it proves |
|---|---|
| `auth.integration.spec.ts` | real OTP store (Redis) flow: send → verify → session/token issuance; rate-limit block |
| `users.integration.spec.ts` | user + transporter CRUD against real DB, unique-constraint 409s |
| `packages.integration.spec.ts` | recipient/address create with city→province; package flow; tracking PII check |
| `trips.integration.spec.ts` | trip create w/ ownership; request accept → escrow; tracking update assembly |
| `pricing.integration.spec.ts` | golden price equals unit-test golden (config wired correctly) |
| `health.integration.spec.ts` | `/health` responds OK when DB+Redis up |

External calls (SMS, Neshan, S3) are **mocked at the port boundary** (from Phase 5) via provider overrides
in the integration `TestingModule` — no network, no secrets (T-6).

### 2.3 Runner wiring
- `test/jest-integration.json` (testEnvironment node, `setupFilesAfterEnv`, longer timeout 30s).
- `npm run test:integration` — runs db push (against `TEST_DATABASE_URL`) + integration suite.

---

## 3. Task 2 — CI pipeline rewrite (`.github/workflows/test-build.yml`)

```
jobs:
  test:            # lint + types + unit (NO secrets)
    steps: npm ci → prisma generate → lint → tsc --noEmit → npm test → coverage report (upload artifact)
  integration:     # needs test
    services: postgres + redis (as today)
    steps: npm ci → prisma generate → prisma db push → npm run test:integration
  build:           # needs integration, only on master push
    steps: docker build/push (unchanged target runtime)
```

- Unit job env: **remove all secrets** (only non-secret `NODE_ENV=test`).
- Integration job: only `TEST_DATABASE_URL` style vars + mocked port overrides (no AWS/SMS/MAP secrets).
- Coverage gate lives in Jest (`coverageThreshold`), so CI fails naturally — plus upload
  `coverage/lcov-report` as an artifact.

### 3.1 Jest `coverageThreshold` (global)
```json
"coverageThreshold": {
  "global": { "statements": 100, "functions": 100, "lines": 100, "branches": 95 }
}
```
Rationale: policy from TESTING-STRATEGY; `main.ts` + `*.module.ts` stay excluded. If a carve-out is
needed, it is added to `TESTING-STRATEGY.md` with justification **before** the gate is switched on.

---

## 4. Task 3 — Ops files
- `entrypoint.sh`: split into `entrypoint.sh` (schema push only) and **seed as an explicit, idempotent
  npm script** (`seed` already exists) — **stop seeding on every container boot** (O-3); add
  `SEED_ON_BOOT` env (default false) honored by the script.
- `Dockerfile`: verify `dev`/`runtime` targets still match new `npm run` scripts; no schema change.
- `prisma/.env`: remove from git; document in `.env.example` (C-7).
- Add `npm run prisma:generate:ci`? Not needed — CI already calls `prisma generate`.

---

## 5. Task 4 — e2e smoke suite (`test/e2e/`)
Retire `test/app.e2e-spec.ts` ("Hello World!") and replace with:
- `health.e2e-spec.ts` — boots the full `AppModule` with ports mocked, asserts `/health` 200.
- `validation.e2e-spec.ts` — POST to a known route with an unknown field → 400 standardized envelope.
- `not-found.e2e-spec.ts` — unknown route → 404 envelope incl. `requestId` (Phase 2 filter).
These run with the **same infra as integration** (postgres + redis) via `npm run test:e2e`.

---

## 6. Task 5 — Final documentation & frontend digest
- Update `README.md`: testing section (three tiers), coverage badge, new env vars (`CORS_ORIGINS`,
  `API_PREFIX`, `THROTTLE_*`, `JWT_*_EXPIRES_IN`, `MAX_UPLOAD_SIZE_MB`, `TIMEOUT_MS`, `LOG_LEVEL`),
  corrected pricing env table.
- `BREAKING-CHANGES.md`: consolidate all entries (2.x–5.x) into a single **frontend migration guide**
  with FAQ + timeline.
- `REFACTORING-PLAN.md`: final progress tracker; close all issues in the disposition table.
- `CODEBASE-AUDIT.md`: refresh severity table (what's fixed), keep as historical record.

---

## 7. Definition of Done (final, whole-project)

- [ ] Integration suite green in CI against Dockerized Postgres/Redis (no secrets)
- [ ] e2e smoke suite green; scaffold "Hello World!" removed
- [ ] Coverage gate enforced — **global 100/100/100/95**; CI fails below with artifact
- [ ] CI: test(lint+unit) → integration → build(push) all green
- [ ] Ops files updated (no per-boot seeding; `prisma/.env` untracked)
- [ ] README + docs finalized; `BREAKING-CHANGES.md` digest delivered to frontend
- [ ] Final full run: `npm run lint` (0 errors), `npx tsc --noEmit`, `npm run test:cov`, `npm run test:integration`

---

## 8. As-built notes

*(Filled when the phase completes — record deviations, actual coverage numbers, CI timings.)*