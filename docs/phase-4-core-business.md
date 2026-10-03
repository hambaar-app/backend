# Phase 4 — Core Business: Package, Trip, Matching, Pricing, Turf

> **Status:** 🚧 In progress (partial: Tasks 1–3 landed) · **Spec version:** 1.2 (2026-10-03)
>
> **Audit issues in scope:** A-1 (package 22 KB / trip 32 KB god services), A-2, A-3 (final boilerplate removal), A-4 (session mutation in transactions), B-4, B-9, B-10, S-8 (tracking PII).
> **Depends on:** Phase 2 (filter, runner-friendly error handling), Phase 3 (config/token patterns, session-utils).
>
> **Rollup note:** §10 of this doc is the consolidated as-built for Phases 1–4
> (per docs-only review 2026-09-04). Phase 1–3 details stay in their own files;
> this file summarizes what actually landed and what remains.

## 1. Objective

Dismantle the two biggest service classes into **domain/application services with single
responsibilities**, make pricing a **strategy-driven engine**, extract matching scoring into a pure
scorer, and introduce a `TransactionRunner` that eliminates the repeated
`.catch(formatPrismaError); throw` boilerplate. Then lock everything with 100% tests.

---

## 2. Task 1 — `TransactionRunner` (`src/modules/prisma/transaction-runner.ts`)

> **Status:** ✅ Landed (`3110252`).

```ts
@Injectable()
export class TransactionRunner {
  constructor(config: ConfigService, private prisma: PrismaService) {}
  run<T>(fn: (tx: PrismaTransaction) => Promise<T>, options?: TransactionRunnerOptions): Promise<T>;
  runIsolated<T>(fn: (tx: PrismaTransaction) => Promise<T>, options?: TransactionRunnerOptions): Promise<T>;
}
```

- Central error conversion is **removed** from this layer: the global `AllExceptionsFilter` (Phase 2)
  already maps Prisma errors, so `run` just re-throws. Services stop importing `formatPrismaError` (A-3 done).
- Default `timeout` configurable (`PRISMA_TX_TIMEOUT_MS`, default 5000) with an explicit `TransactionTimedOutError`.

Tests — `transaction-runner.spec.ts`: success returns value; rollback on inner throw; timeout path;
re-throw preserves original error instance.

---

## 3. Task 2 — Pricing engine & strategies (`src/modules/pricing/strategies/`)

> **Status:** ✅ Landed (`7985842`). Slim facade preserves the public API consumed by
> `package.service` (`calculateSuggestedPrice` / `calculateTransporterEarnings` /
> `calculateDeviationCost` / `calculateDistanceCost`).

Replace the monolithic `PricingService` with a composition of testable strategies (same public API + defaults):

| Strategy | File | Responsibility | Bug fixed |
|---|---|---|---|
| `DistanceTierStrategy` | `distance-tier.strategy.ts` | tiered per-km cost; **guard clause** for `remainingDistance <= 0`; explicit `tierCredit` formula via config bounds (no magic `+1`) | **B-10** |
| `WeightStrategy` | `weight.strategy.ts` | weight surcharge (current: free <500 g) | — |
| `SpecialHandlingStrategy` | `special-handling.strategy.ts` | fragile/perishable/both multipliers | — |
| `CityPremiumStrategy` | `city-premium.strategy.ts` | major-city factors, `PRICING_MAJOR_CITIES` parsing | — |
| `DeviationCostStrategy` | `deviation-cost.strategy.ts` | distance + time deviation | — |
| `EarningsStrategy` | `earnings.strategy.ts` | transporter share (`driverShare`, default 0.7) | — (added during implementation; spec §3 listed 5, code ships 6) |

- `PricingEngine` orchestrates: `calculateSuggestedPrice(input): { suggestedPrice, breakdown }`,
  `calculateTransporterEarnings`, `calculateDeviationCost`.

- **Decision on C-4:** `PRICING_PLATFORM_COMMISSION` remains unused by design (commission = `1 − driverShare`);
  the README env list is corrected in Phase 6, and `env.validation.ts` documents the canonical set.
  Alternatively, if the product wants an explicit commission env, that becomes a product decision — tracked here.

Tests — table-driven per strategy (boundary km tiers, zero weight, multipliers each branch, city premium
each quadrant incl. case-insensitive major-city match, deviation) + engine integration (breakdown math
matches current output for a fixed input — record the golden value).

---

## 4. Task 3 — Matching & Turf (`src/modules/package/matching/`)

> **Status:** ✅ Landed (branch `refactor/phase-4-matching`).

Extract pure, highly-tested pieces from `matching.service.ts`:

- `MatchingScorer` — `calculateMatchingScore(originDistance, destinationDistance, isOnCorridor)`
  (current rules: corridor penalty, ±500 close-point bonuses, clamp ≥0).
- `CorridorAnalyzer` — `analyzeTrip(tripRoute, packageOrigin, packageDestination, corridorWidthKm)`:
  distance-to-route via TurfService, corridor + direction checks. Returns `MatchResult | null`.
- `TripCandidateQuery` — builds the pre-filter Prisma where-clause (active+scheduled, `updatedAt` >= lastCheck,
  weight capacity OR-null) — pure, takes a small typed input.
- `MatchingService` keeps orchestration (session bookkeeping, parallel analysis, merge+sort+limit)
  but delegates scoring/analysis; **no console.error** — Nest `Logger` (B-4).
- Open TODOs documented: departure-time filtering, transporter-rating scoring (MVP gap — no behavior change).

Tests: `matching-scorer.spec.ts` (boundaries: on/off corridor, <1000 m bonuses, zero clamp),
`corridor-analyzer.spec.ts` (in/out corridor, reversed direction, missing waypoints),
`trip-candidate-query.spec.ts` (no lastCheck, with lastCheck, weight present/null), `matching.service.spec.ts`
(session creation, merge/sort/limit, allSettled behavior preserved — including the swallow-null path).

---

## 5. Task 4 — Split `TripService` (32 KB → 3 services)

> **Status:** ⬜ Not started (no `trip/application/` or `trip/domain/` files yet).

The 6-dep monolithic `TripService` becomes:

| Service | File | Responsibilities moved from today |
|---|---|---|
| `TripService` (slim) | `src/modules/trip/application/trip.service.ts` | `create`, `getById`, `getMultipleById`, `getAll`, trip CRUD state helpers |
| `TripRequestService` | `src/modules/trip/domain/trip-request.service.ts` | `updateRequest` (accept/reject), `createRequest`, `cancelRequest`, request list |
| `TripTrackingService` | `src/modules/trip/domain/trip-tracking.service.ts` | tracking code generation, `addTrackingUpdate`, `getTripRoute`, rate-trip |

Key refactors:
- `create`: keep `calculateDistance` (map) + vehicle-ownership `Forbidden` + notification — but use
  `TransactionRunner`, no manual `.catch`.
- `updateRequest`: current `if (rejected)` branch keeps its behavior; the DTO-local enum stays (Phase 1).
- `cancelRequest`: **move the session mutation out of the DB transaction** — call a `session-utils`
  helper *after* the tx commits (A-4 mitigation), and add a comment documenting the eventual-consistency
  caveat (Redis session is not transactional with Postgres).
- `rateTrip` + financial escrow interplay stays in `TripRequestService` with the intentional
  **non-fatal escrow failure** behavior preserved (comment already added in Phase 1).
- `TripController` splits route handling into the three services (public method names preserved for
  controller delegation).

Tests — re-implement `trip.service.spec.ts`; add `trip-request.service.spec.ts` (accept→escrow+notification+
status; reject→transaction; cancel→session isolation + notification; ownership errors; wrong status enum rejected)
and `trip-tracking.service.spec.ts` (code format, update creation, route assembly, rate validation).

---

## 6. Task 5 — Split `PackageService` (22 KB → 3 services)

> **Status:** ⬜ Not started (no `package/application/` or `package/domain/` files yet;
> S-8 PII mask and B-9 `JsonArray` removal still pending).

| Service | File | Responsibilities |
|---|---|---|
| `PackageService` (slim) | `src/modules/package/application/package.service.ts` | package CRUD, price suggestions, status flow, `findMatchedTrips` orchestration |
| `RecipientService` | `src/modules/package/domain/recipient.service.ts` | recipient CRUD + address creation (city→province resolution) |
| `PackageRequestService` | `src/modules/package/domain/package-request.service.ts` | trip requests from package side, cancel request, session update |
| `TrackingService` | `src/modules/package/domain/tracking.service.ts` | `getTrackingByCode` |

Key refactors:
- `createRecipient`: city lookup + address create in one `TransactionRunner` op; error mapping via filter.
- `findMatchedTrips`/matching orchestration delegates to `MatchingService`; session helpers from `session-utils`.
- `getTrackingByCode` — **S-8 fix**: remove `sender.phoneNumber` from the public response
  (masked as `+98•••••123` or dropped) — breaking change listed in §8.
- Remove the internal `generated/prisma/runtime/library` `JsonArray` import (B-9): type the breakdown
  payload with an exported `PackageBreakdown` interface.

Tests — re-implement `package.service.spec.ts`; add recipient/tracking/request specs covering every
status transition + failure path; tracking PII test asserts the phone is masked.

---

## 7. Task 6 — TurfService & leftover cleanup

> **Status:** ⬜ Not started.

- `turf.service.ts` stays (pure geometry wrapper) but gains `createRoute`, `createPoint`,
  `getDistanceToRoute`, `checkDirectionCompatibility` — all already there; add **100% specs** with
  real Turf calls (no mocks needed) incl. `null`/degenerate route inputs.
- `notification-messages.ts`: keep; add spec for placeholder substitution incl. missing-context leaves
  `{key}` untouched.
- Remove `MapService→PrismaService` dependency from the package/trip paths if still reachable
  (the city lookups move to a `CityRepository` in Phase 5 — referenced here so it is not skipped).

---

## 8. Breaking changes (this phase)

| # | Change | Frontend action |
|---|---|---|
| 4.0 | **Partial landing (Task 1 + Task 2, 2026-09-04): no API-visible change.** Pricing output is byte-identical by golden parity; `TransactionRunner` is internal only | none |
| 4.1 | `/tracking/:code` response no longer includes `sender.phoneNumber` (masked/dropped, S-8) — **pending** (Task 5 not started) | Stop relying on sender PII in tracking screens |
| 4.2 | Pricing output must remain **byte-identical** (golden test enforced) | none — if drift detected, treat as bug and record here |

## 9. Definition of Done (checklist)

- [x] `TransactionRunner` added with configurable timeout + `run`/`runIsolated` (`3110252`); adoption across package/trip paths still pending — A-3 not yet resolved phase-wide
- [x] Pricing engine + 6 strategies with table-driven tests + golden parity (`7985842`); golden output test for backward equality present as `pricing.engine.spec.ts`
- [ ] Matching/scoring extracted and 100% tested; console logging removed (Logger) — **done for matching (Task 3); Turf full specs remain Task 6**
- [ ] Trip split complete: request/tracking domain services 100%
- [ ] Package split complete: recipient/request/tracking services 100%
- [ ] Tracking PII masked + tested; `JsonArray` internal import removed
- [ ] Turf & notification-messages specs at 100%
- [ ] session mutation moved out of tx for `cancelRequest` (A-4)
- [ ] `tsc` exit 0, lint 0 errors, `npm test` green; touched modules 100/100/100/95 — **partial:** `tsc` clean, pricing+prisma 10 suites / 98 tests green, lint has 17 errors (see §10.6)
- [ ] `BREAKING-CHANGES.md` updated (4.0 no-op entry added; 4.1 still pending)

---

## 10. As-built notes

> Docs-only review 2026-09-04 (branch `refactor/core-business` @ `7985842`).
> No `src/` changes in this review — deviations are recorded as debt for follow-up.

### 10.1 Status snapshot

- Phase 4 Tasks 1–2 landed; Tasks 3–6 untouched. Proof: `git diff master...HEAD --name-only`
  lists only `src/common/config/*`, `src/modules/pricing/**`, `src/modules/prisma/transaction-runner*`.
- `src/modules/package/matching/`, `trip/application/`, `trip/domain/`,
  `package/application/`, `package/domain/` do not exist yet.

### 10.2 Rollup — what Phases 1–4 actually changed

| Phase | Commit | Landed change | Evidence |
|---|---|---|---|
| 1 — Foundation | `06e0ae9` | Jest scoped to `src/**/*.ts`, `isolatedModules` (514 s → ~20 s), ESLint flat type-checked config, `moment` removed (`date-fns` rewrite), `jest-mock-extended` → devDeps, `test/fixtures/` (user/session/location) | `docs/phase-1-foundation.md` as-built; baseline 68.13/59.82/41.80/67.53 |
| 2 — Bootstrap/Config/Security | `cfb158a` | `EnvSchema` + `ConfigKey`, `getCookieOptions`, `parseCorsOrigins`/swagger helpers, `PrismaErrorMapper` + `AllExceptionsFilter`, `Transform`/`Logging`/`Timeout` + `RequestIdMiddleware`, `infra/session/` (cookie-parser first, sync wiring, quit-on-shutdown), `BaseTokenGuard` + 5 guards (B-2 merge fix), `main.ts` hardened (helmet, compression, CORS env, prefix, shutdown, swagger gate, Logger), health external ping removed | `docs/phase-2-security-config.md` §11–12; `BREAKING-CHANGES.md` 2.1–2.5 applied |
| 3 — Auth/Session/User | `ea84577` | `codes.ts` (`generateSecureOtp` 6-digit zero-padded; legacy `generateCode` kept deprecated), `TokenService` public typed API + `JWT_*_EXPIRES_IN` (20d/20m/1d), `OtpService` + `OTP_CACHE`/`OTP_CONFIG` (fixes C-1 trailing-space key, C-3 positional store), `AuthStateMachine` (Injectable for mocking), `TransporterSignupService`, `session-utils.ts`, `check-otp.code: string`, `SmsService.sendOtp(string)`, interim `S3_STORAGE_PORT` in user | `docs/phase-3-auth-session.md` §11; `BREAKING-CHANGES.md` 3.1–3.4 applied |
| 4 partial — Runner | `3110252` | `TransactionRunner` (`run` + `runIsolated` serializable), `ConfigKey.Database.TransactionTimeoutMs` + `PRISMA_TX_TIMEOUT_MS` (default 5000), `P2028 → TransactionTimedOutError`, re-throw otherwise (filter owns mapping), wired in `prisma.module.ts` + `transaction-runner.spec.ts` | §10.3 |
| 4 partial — Pricing | `7985842` | `PricingEngine` (pure pipeline, legacy arithmetic order preserved) + 6 strategies + `buildPricingStrategies` factory + slim `PricingService` facade (same 4 public methods); B-10 tier spans derived (`upToKm − previousUpToKm`); table-driven specs + golden-equality engine spec + facade spec | §10.4 |

### 10.3 Task 1 as-built (`TransactionRunner`)

- Files: `src/modules/prisma/transaction-runner.ts`, `transaction-runner.spec.ts`,
  `prisma.module.ts`, `src/common/config/config-names.ts`, `env.validation.ts`
  (`PRISMA_TX_TIMEOUT_MS` optional int).
- Extension vs spec §2: constructor takes `ConfigService` (not just `PrismaService`);
  `run(fn, options?)` / `runIsolated(fn, options?)` with `{ timeoutMs, isolationLevel }`;
  `runIsolated` forces `Serializable` unless overridden. Documented here; spec signature above updated.
- Behavior: timeout resolved per-call (`timeoutMs ?? defaultTimeoutMs`) and passed to
  `prisma.$transaction(fn, { timeout, isolationLevel })`; only `code === 'P2028'` maps to
  `TransactionTimedOutError`, everything else re-thrown untouched for `AllExceptionsFilter`.
- Tests (`transaction-runner.spec.ts`): success value, rollback on inner throw,
  timeout mapping, original-error preservation. Part of the 10-suite / 98-test green run (§10.7).

### 10.4 Task 2 as-built (Pricing)

- Files: `pricing.engine.ts`, `pricing.service.ts` (facade), `strategies/`:
  `distance-tier`, `weight`, `special-handling`, `city-premium`, `deviation-cost`,
  `earnings`, `pricing-factory` (+ 8 co-located specs: engine, facade, 6 strategy/factory specs).
- Parity: `PricingEngine.calculateSuggestedPrice` keeps legacy order
  (base + distance + weight → `× specialMultiplier` → `× cityPremium` → round to nearest 1000);
  `DistanceTier.getSpanKm()` = `upToKm − previousUpToKm` (Infinity for open tier) with
  `remainingDistance <= 0` guard, reproducing the legacy `maxKm − minKm + 1` output without the `+1`.
  `CityPremiumStrategy` is case-insensitive over `parseMajorCities(...)`.
- Commit message cites a 500-check parity harness + golden capture proving byte-identical
  output across 5 config variants. No `pricing-golden.json` is committed in the diff —
  treat the harness as ephemeral and `pricing.engine.spec.ts` as the durable golden test.
- C-4 decision stands: `PRICING_PLATFORM_COMMISSION` stays unused (`commission = 1 − driverShare`);
  README correction deferred to Phase 6.

### 10.5 Remaining (Tasks 3–6 — not started)

- Matching scorer / corridor analyzer / candidate query + `Logger` swap (B-4).
- Trip split, package split (incl. S-8 PII mask, B-9 `JsonArray` removal, A-4 session-out-of-tx).
- Turf 100% specs + `notification-messages` spec + `MapService → CityRepository` (Phase 5 ref).

### 10.6 Deviations / documented debt (docs-only — no code fix in this review)

| # | Drift | Location | Follow-up |
|---|---|---|---|
| D-1 | Spec listed 5 strategies; code ships 6 (`EarningsStrategy`) | §3 table | Table updated; no action |
| D-2 | `pricing-factory.ts` uses string literals `'PRICING_*'` instead of `ConfigKey.Pricing.*` | `strategies/pricing-factory.ts:16-45` | Migrate to `ConfigKey` when pricing is next touched (CONVENTIONS §4) |
| D-3 | `EnvSchema` types all `PRICING_*` multipliers/share as `@IsInt()` — rejects valid floats (`1.25`, `0.7`) | `env.validation.ts:85-108` | Change to `@IsNumber()` + range check in a later phase |
| D-4 | Factory defaults diverge from `README.md` env table (weight 10000 vs 8000; dest 1.3 vs 1.2; small 1.2 vs 1.15; deviation 15000/5000 vs 2000/1500; tiers 1000/950/850/750/600 vs 1200/1000/850/750/650; major-cities 3 vs 6) | `pricing-factory.ts:15-78` vs `README.md` | Reconcile in Phase 6 README pass (C-4); treat factory as source of truth until then |
| D-5 | Lint: 1 new Phase-4 error (`pricing.engine.spec.ts:12 TABRIZ` unused) + 16 pre-existing errors (unused imports in Phase-2 specs/filter, `health.controller.spec.ts` floating promise) + 236 warnings | `npm run lint` 2026-09-04 | Fix `TABRIZ` + unused imports with the phase that owns each file |
| D-6 | Golden harness not committed | commit `7985842` message | Keep `pricing.engine.spec.ts` as durable proof; optionally commit harness artifact later |

### 10.7 Verification performed (2026-09-04, branch `refactor/core-business`)

- `npx tsc --noEmit` — exit 0.
- `npm test -- src/modules/pricing src/modules/prisma` — 10 suites / 98 tests passed.
- `npm run lint` (= `eslint --fix` per `package.json`) — converges to **17 errors / 236 warnings**
  (1 new Phase-4 error `pricing.engine.spec.ts:12 TABRIZ` unused + 16 pre-existing in Phase-2
  specs/filter + `health.controller.spec.ts` floating promise; see D-5). The `--fix` formatting
  side effects on `src/` were reverted (`git restore src/`) to keep this review docs-only.
  Note: raw `eslint --no-fix` on a Windows checkout reports ~19k `prettier/prettier Delete ␍`
  line-ending hits — pre-existing CRLF env noise, not real debt.
- `git diff master...HEAD --stat` — 23 files, +1113/−723, confined to config/pricing/prisma.
- Full-suite `npm test` / `test:cov` not re-run here; commit `7985842` records 53/53 suites, 401/401 tests.
- Docs plumbing: `/docs` removed from `.gitignore` (it was added together with a mass
  `docs/` deletion in `2c50a47`, which is why `docs/` was untracked) so this improvement set is
  committable; `/generated` stays ignored. Root `phase-1-foundation.md` deleted (docs/ canonical).

### 10.8 Task 3 as-built (2026-10-03, branch `refactor/phase-4-matching`)

- Files: `src/modules/package/matching/matching-scorer.ts` (+spec),
  `trip-candidate-query.ts` (+spec), `corridor-analyzer.ts` (+spec);
  slimmed `src/modules/package/matching.service.ts` (delegates, `Logger`,
  `ConfigKey.Pricing.CorridorWidth`); `turf.service.ts` `console.error` → `Logger`;
  `test/fixtures/match.fixture.ts` (+ barrel export).
- Parity: scorer/query/analyzer moved verbatim; `MatchingService` keeps public
  signature + session merge/sort/limit + swallow-`null` `allSettled` behavior;
  private `getPreFilteredTrips`/`analyzeTrip`/`calculateMatchingScore` kept as thin
  delegates (backward-compatible for spies). No API-visible change (BREAKING 4.0 stands).
- Decisions: `ConfigKey` used now (pays down D-2 pattern for matching; pricing
  factory migration still pending); `CorridorAnalyzer` is a plain class constructed
  inside the service (pricing-facade pattern — no module wiring change).
- Gotcha: `expect.anything()` does **not** match `jest-mock-extended` `mockDeep`
  proxies — assert by reference (`prismaService`) instead.
- Verification: `tsc` exit 0; `npm test -- src/modules/package src/modules/turf
  src/modules/prisma src/modules/pricing` — 17 suites / 183 tests green;
  scoped `eslint --fix` on touched files — **0 errors** (2 `require-await`
  warnings: `analyzeTrip` stays `async` for the `.catch` chain — same as before).
  Matching units at 100/100/100/95+; `turf.service.ts` full 100% remains Task 6
  (only the touched `getDistanceToRoute` fallback path is now covered).