# Phase 4 — Core Business: Package, Trip, Matching, Pricing, Turf

> **Status:** ⬜ Not started · **Spec version:** 1.0 (2026-09-02)
>
> **Audit issues in scope:** A-1 (package 22 KB / trip 32 KB god services), A-2, A-3 (final boilerplate removal), A-4 (session mutation in transactions), B-4, B-9, B-10, S-8 (tracking PII).
> **Depends on:** Phase 2 (filter, runner-friendly error handling), Phase 3 (config/token patterns, session-utils).

## 1. Objective

Dismantle the two biggest service classes into **domain/application services with single
responsibilities**, make pricing a **strategy-driven engine**, extract matching scoring into a pure
scorer, and introduce a `TransactionRunner` that eliminates the repeated
`.catch(formatPrismaError); throw` boilerplate. Then lock everything with 100% tests.

---

## 2. Task 1 — `TransactionRunner` (`src/modules/prisma/transaction-runner.ts`)

```ts
@Injectable()
export class TransactionRunner {
  constructor(private prisma: PrismaService) {}
  run<T>(work: (tx: PrismaTransaction) => Promise<T>): Promise<T>; // single $transaction wrapper
  runIsolated<T>(work: (tx: PrismaTransaction) => Promise<T>): Promise<T>; // serializable/full isolation flag
}
```

- Central error conversion is **removed** from this layer: the global `AllExceptionsFilter` (Phase 2)
  already maps Prisma errors, so `run` just re-throws. Services stop importing `formatPrismaError` (A-3 done).
- Default `timeout` configurable (`PRISMA_TX_TIMEOUT_MS`, default 5000) with an explicit `TransactionTimedOutError`.

Tests — `transaction-runner.spec.ts`: success returns value; rollback on inner throw; timeout path;
re-throw preserves original error instance.

---

## 3. Task 2 — Pricing engine & strategies (`src/modules/pricing/strategies/`)

Replace the monolithic `PricingService` with a composition of testable strategies (same public API + defaults):

| Strategy | File | Responsibility | Bug fixed |
|---|---|---|---|
| `DistanceTierStrategy` | `distance-tier.strategy.ts` | tiered per-km cost; **guard clause** for `remainingDistance <= 0`; explicit `tierCredit` formula via config bounds (no magic `+1`) | **B-10** |
| `WeightStrategy` | `weight.strategy.ts` | weight surcharge (current: free <500 g) | — |
| `SpecialHandlingStrategy` | `special-handling.strategy.ts` | fragile/perishable/both multipliers | — |
| `CityPremiumStrategy` | `city-premium.strategy.ts` | major-city factors, `PRICING_MAJOR_CITIES` parsing | — |
| `DeviationCostStrategy` | `deviation-cost.strategy.ts` | distance + time deviation | — |

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
| 4.1 | `/tracking/:code` response no longer includes `sender.phoneNumber` (masked/dropped, S-8) | Stop relying on sender PII in tracking screens |
| 4.2 | Pricing output must remain **byte-identical** (golden test enforced) | none — if drift detected, treat as bug and record here |

## 9. Definition of Done (checklist)

- [ ] `TransactionRunner` in use across package/trip/pricing paths; services no longer call
      `formatPrismaError` (A-3 resolved)
- [ ] Pricing engine + 5 strategies with table-driven 100% tests; golden output test for backward equality
- [ ] Matching/scoring extracted and 100% tested; console logging removed (Logger)
- [ ] Trip split complete: request/tracking domain services 100%
- [ ] Package split complete: recipient/request/tracking services 100%
- [ ] Tracking PII masked + tested; `JsonArray` internal import removed
- [ ] Turf & notification-messages specs at 100%
- [ ] session mutation moved out of tx for `cancelRequest` (A-4)
- [ ] `tsc` exit 0, lint 0 errors, `npm test` green; touched modules 100/100/100/95
- [ ] `BREAKING-CHANGES.md` updated

---

## 10. As-built notes

*(Filled when the phase completes — record deviations, actual coverage numbers, timings.)*