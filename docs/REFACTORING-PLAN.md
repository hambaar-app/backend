# Hambaar Backend — Refactoring Master Plan

> **Status:** 🚧 In progress · **Started:** 2026-09-02 · **Baseline:** `ae11d31`
>
> See [INDEX.md](./INDEX.md) for the document map, [CODEBASE-AUDIT.md](./CODEBASE-AUDIT.md) for the full evidence base, [CONVENTIONS.md](./CONVENTIONS.md) for target architecture rules, [TESTING-STRATEGY.md](./TESTING-STRATEGY.md) for the coverage policy, and [BREAKING-CHANGES.md](./BREAKING-CHANGES.md) for API changes frontend must adopt.

---

## 1. Goals

1. **Professional architecture:** domain/business logic separated from persistence and infrastructure; thin controllers; explicit service boundaries; strategies for pricing & matching; global pipes/filters/interceptors instead of copy-pasted error handling.
2. **100% test confidence:** re-implement the entire unit test suite; enforce **100% statements / functions / lines, ≥95% branches** via Jest thresholds and the CI pipeline.
3. **Security & correctness:** fix the identified 🔴/🟠 issues (CORS, cookie flags, config validation, session bootstrap race, guard duplication, PII exposure).
4. **Zero schema changes:** Prisma schema and `db push` workflow stay untouched.
5. **Complete documentation:** every phase ships a phase doc; every breaking change is recorded for the frontend team.

## 2. Non-Goals

- Database schema redesign, migrations, or data changes.
- Changing deployment target (Liara + Docker Hub pipeline stays).
- New features (payment gateway etc. remain TODOs — documented, not implemented).

## 3. Constraints & Ground Rules

| Rule | Detail |
|---|---|
| App stays working | Every phase ends with a green build and a passing test suite; phases are independently shippable. |
| API stability | Existing endpoints keep their contracts unless listed in `BREAKING-CHANGES.md`. |
| No schema changes | Prisma schema files are read-only during the refactor. |
| Coverage gate | From Phase 1 onward, coverage is measured; the hard gate is enforced per-module as each phase completes (global gate switched on in Phase 6). |
| Test style | Unit tests are fully mocked (no DB/Redis/network); integration tests (Phase 6) use Dockerized Postgres/Redis in CI. |
| Secrets | Unit tests must never require env secrets or network access. |

---

## 4. Phase Overview

| # | Phase | Focus | Doc |
|---|---|---|---|
| 1 | Foundation & Test Infrastructure | Jest config, coverage baseline, test utilities, deps hygiene, docs | [phase-1-foundation.md](./phase-1-foundation.md) |
| 2 | Bootstrap, Config & Security | main.ts, config schema, session, guards consolidation, filters/interceptors | [phase-2-security-config.md](./phase-2-security-config.md) |
| 3 | Auth, Session & User Domain | OTP service, auth state machine, signup split, token API | [phase-3-auth-session.md](./phase-3-auth-session.md) |
| 4 | Core Business (Package/Trip/Matching/Pricing/Turf) | Split god services, pricing strategy, transaction runner | [phase-4-core-business.md](./phase-4-core-business.md) |
| 5 | Supporting Modules & Infra Adapters | vehicle, address, financial, map, s3, sms, support, dashboard, health | [phase-5-supporting-modules.md](./phase-5-supporting-modules.md) |
| 6 | Integration Tests, CI & Final Docs | Dockerized integration suite, CI gates, README, completion | [phase-6-integration-ci.md](./phase-6-integration-ci.md) |

### Phase sequencing rationale
Phases are ordered by blast radius: infrastructure first (everything depends on bootstrap/config), then the auth stack (everything depends on auth), then the two god services, then the long tail. Tests are re-implemented **within the phase that touches the code**, so behavior is locked in as it is refactored.

---

## 5. Target Architecture (end state)

```
src/
├── main.ts                        # bootstrap only: pipes, filters, helmet, prefix, shutdown
├── app.module.ts                  # module composition only (no I/O in configure())
├── common/
│   ├── config/                    # env schema validation + typed config namespaces
│   ├── constants/
│   ├── decorators/                # CurrentUser, Serialize, @AuthRoles …
│   ├── enums/
│   ├── exceptions/                # custom exception classes
│   ├── filters/                   # AllExceptionsFilter, PrismaExceptionFilter
│   ├── guards/                    # base token guard + composable auth guards
│   ├── interceptors/              # Serialize, Logging, Timeout
│   ├── pipes/
│   ├── utils/                     # small pure helpers (codes, digits, dates) — fully unit-tested
│   └── validators/                # class-validator custom constraints
├── infra/                         # external world adapters (interfaces + impls)
│   ├── storage/                   # S3StorageAdapter
│   ├── sms/                       # SmsAdapter (s.api.ir)
│   ├── maps/                      # MapsProvider (Neshan)
│   ├── cache/                     # named Redis stores (cache, otp, session)
│   └── session/                   # session middleware factory
└── modules/
    ├── auth/
    │   ├── application/           # AuthService (orchestration only)
    │   ├── domain/                # OtpService, AuthStateMachine, signup policies
    │   └── ...dto/controllers
    ├── user/
    ├── vehicle/
    ├── address/
    ├── package/
    │   ├── application/           # PackageService (orchestration)
    │   ├── domain/                # recipient/item/recipients rules, request lifecycle
    │   └── matching/              # MatchingService + scoring strategies
    ├── trip/
    │   ├── application/
    │   ├── domain/                # TripRequestService, TripTrackingService
    │   └── ...
    ├── pricing/
    │   ├── application/
    │   └── strategies/            # DistanceTierStrategy, SpecialHandlingStrategy, CityPremiumStrategy
    ├── financial/ map/ notification/ dashboard/ support/ health/ token/ turf/
    └── prisma/                    # PrismaService + TransactionRunner
```

**Layer rules:**
1. Controllers: HTTP concerns only — validate, delegate, serialize. No Prisma, no business logic.
2. Application services: orchestrate domain services + infra adapters; own transactions via `TransactionRunner`.
3. Domain services: pure business rules, unit-testable with zero mocks of Nest/Prisma internals where possible.
4. Infra adapters: the only code that talks to S3/SMS/Neshan/Redis; each behind an interface so unit tests swap in fakes.
5. No direct `cacheManager.stores[n]` positional access — named stores injected by token.
6. No `console.*` — Nest `Logger` (or a wrapper) only.

---

## 6. Issue Disposition

Every audited issue is either resolved by a phase or explicitly waived:

| Issues | Disposition | Where |
|---|---|---|
| A-1, A-2 | Resolved — layer extraction + thin controllers | Phases 3–5 |
| A-3 | Resolved — `AllExceptionsFilter` + `PrismaErrorMapper` + `TransactionRunner` remove all boilerplate | Phase 2 (filter/mapper), Phase 4 (runner) |
| A-4 | Mitigated — session kept (no schema change allowed) but session mutation extracted into explicit domain functions with documented consistency caveats | Phases 3–4 |
| B-1..B-5, B-8..B-10 | Resolved in the phase owning the file | Phases 2–5 |
| B-6 | Resolved — `moment` removed, `getDateDifference` rewritten with `date-fns` | Phase 1 |
| B-7 | Partially resolved — `jest-mock-extended` moved to devDeps (Phase 1); cookie-parser-before-session ordering + `prisma/.env` removal remaining | Phase 1, Phase 2/6 |
| B-11 | Resolved — type-checked ESLint flat config added | Phase 1 |
| B-12 | Resolved — ts-jest `isolatedModules` (514s → ~20s); type safety via `tsc --noEmit` + ESLint | Phase 1 |
| C-1..C-7 | Resolved (C-7 partially: keep `db push`, remove committed `prisma/.env`, stop seeding on every boot) | Phase 2 |
| O-1, O-3 | Resolved | Phase 2 |
| O-2 | Waived — no schema/infra change budget; revisit post-refactor | — |
| S-1..S-8 | Resolved (S-3: token lifetime becomes configurable with sane default; rotation deferred — needs schema change) | Phases 2–4 |
| T-1..T-6 | Resolved — full test rewrite + CI gates | Phases 1, 6 |

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Hidden behavior depends on current bugs (e.g. trailing-space env key, biased OTP) | Medium | Medium | Each fix documented in phase doc + `BREAKING-CHANGES.md`; OTP bias fix is behavior-visible only in digit distribution |
| Session-based matching breaks after extraction | Medium | High | Characterization tests written **before** refactor (existing behavior locked in tests first) |
| Coverage gate blocks merge mid-refactor | Medium | Low | Thresholds enforced globally only at Phase 6; per-module expectations tracked in phase docs |
| Frontend breaks on standardized error shape | High | Medium | Error shape changed only in Phase 2 with exact before/after JSON in `BREAKING-CHANGES.md`; frontend coordination step included |
| Windows/CI dev-environment drift | Low | Low | All test commands runnable cross-platform; CI is the source of truth |

## 8. Definition of Done (per phase)

- [ ] All phase tasks implemented and self-reviewed
- [ ] New/changed code at 100% statements/functions/lines, ≥95% branches (module-level `coverageThreshold` where practical)
- [ ] `npm run lint` and `npm test` green locally and in CI
- [ ] Phase doc updated with "as-built" notes and any deviations
- [ ] `BREAKING-CHANGES.md` updated if any contract changed
- [ ] App boots and existing happy-path endpoints respond identically (smoke check)

## 9. Progress Tracker

| Phase | Status | Tests re-implemented | Coverage (module) | Notes |
|---|---|---|---|---|
| 1 — Foundation | ✅ Completed | — | baseline: 68.13/59.82/41.80/67.48 | suite 514s → ~20s; ESLint added; **all docs complete** ([phase-1-foundation.md](./phase-1-foundation.md)) |
| 2 — Security/Config | ⬜ Not started | — | — | spec complete ([phase-2-security-config.md](./phase-2-security-config.md)) |
| 3 — Auth/Session | ⬜ Not started | — | — | spec complete ([phase-3-auth-session.md](./phase-3-auth-session.md)) |
| 4 — Core Business | ⬜ Not started | — | — | spec complete ([phase-4-core-business.md](./phase-4-core-business.md)) |
| 5 — Supporting Modules | ⬜ Not started | — | — | spec complete ([phase-5-supporting-modules.md](./phase-5-supporting-modules.md)) |
| 6 — Integration & CI | ⬜ Not started | — | — | spec complete ([phase-6-integration-ci.md](./phase-6-integration-ci.md)) |


