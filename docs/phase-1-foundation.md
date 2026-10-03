# Phase 1 — Foundation & Test Infrastructure

> **Status:** ✅ Completed · **Doc updated:** 2026-09-02
>
> Goal: make quality measurable and the toolchain trustworthy **before** any logic is refactored. No behavior-level API changes.

## 1. Scope

1. Fix the broken Jest/coverage configuration and measure a real baseline.
2. Fix broken/absent tooling (ESLint) and dependency hygiene.
3. Establish shared test fixtures for all later phases.
4. Ship the documentation set for the whole refactor.
5. Speed up the test suite (it was unusably slow).

## 2. Tasks & As-Built Results

### 2.1 Jest / coverage configuration ✅
**Problem (audit T-1):** `collectCoverageFrom: ["**/*.(t|j)s"]` with `rootDir: "."` swept the entire repo (including `test/`, e2e, and everything else) and no threshold existed.

**Changes (`package.json#jest`):**
- `collectCoverageFrom`: `src/**/*.ts` minus `main.ts` and `*.module.ts` (rationale in `TESTING-STRATEGY.md §1`).
- `coverageDirectory: ./coverage`, `coverageReporters: [text, text-summary, json-summary, lcov]` (json-summary enables per-module tracking later).
- `clearMocks: true` — no cross-test stub leakage.
- Removed `verbose: true` (noise, slower output).

### 2.2 Test suite performance ✅
**Problem (audit B-12):** full coverage run took **514 s** with jest worker force-exit warnings.

**Change:** ts-jest transform now runs with `isolatedModules: true`.
**Result:** coverage run now **~20 s** (≈25× faster). Type safety is preserved by `tsc --noEmit` (CI green) + ESLint type-checked rules.

### 2.3 Dependency hygiene ✅
**Problem (audit B-6, B-7):** `moment` + `date-fns` both shipped; `jest-mock-extended` was a production dependency.

**Changes:**
- `moment` **removed**; `getDateDifference` rewritten with `date-fns`' `differenceInCalendarMonths` (calendar-accurate, replaces the `asMonths() % 12` approximation). Output format unchanged.
- `toPersianDigits` gained a `(value: string | number)` signature and radix-safe parsing.
- `jest-mock-extended` moved to `devDependencies`.
- Lockfile re-synced (`npm install` clean).

### 2.4 ESLint (new) ✅
**Problem (audit B-11):** no ESLint config existed at all — `npm run lint` failed.

**Change:** new `eslint.config.mjs` (flat config):
- `@eslint/js` recommended + `typescript-eslint` **recommendedTypeChecked** (projectService).
- Errors enforced from Phase 1: `no-unused-vars`, `no-floating-promises`, `no-misused-promises`, `no-empty`, `eqeqeq`, prettier.
- Warnings (fixed per-module in phases 2–5): `no-explicit-any`, `no-unsafe-*` family, `no-base-to-string`, `restrict-template-expressions`, `require-await` (removing redundant `async` changes signatures — done per module), `no-console`.
- Spec/test files: type-checked too (tsconfig now includes them); mock-heavy rules relaxed.
- **Result: 0 lint errors** (250 warnings tracked as the phases 2–5 backlog).

**Code fixes applied to satisfy the new gates (all behavior-preserving):**
- `main.ts`: `void bootstrap();` (floating promise).
- `utilities.ts`: braced `case 'P2003'` block (lexical declaration in case).
- `user.service.ts`: unused `phoneNumber` param documented + `_`-prefixed (phone changes go through OTP flow).
- `create-vehicle.dto.ts`, `support.controller.ts`, `health.controller.ts`, `trip.controller.ts`, `trip.service.ts`, `add-funds.dto.ts`, `s3.dto.ts`, `turf.service.spec.ts`: dead imports removed.
- Guards (`deny-authorized`, `multi-token`, `ownership`, `redis-health.indicator`, `sms.service`, `trip.service`): `catch (error)` with unused binding → binding-less `catch` with explanatory comments (no behavior change).
- `auth.service.ts`: `Promise<boolean | never>` → `Promise<boolean>`.
- `auth/types/*`, `token/jwt-payload.d.ts`: dead type imports removed.
- `update-request.dto.ts`: local enum renamed to `UpdateRequestStatusEnum` with an explanatory note (validation subset is intentional — clients may only accept/reject).

### 2.5 Shared test fixtures ✅
New `test/fixtures/`:
- `user.fixture.ts` — `createMockUser(overrides)` (+ `mockUser`, `mockTransporterUser`).
- `session.fixture.ts` — `createMockSession(overrides)` matching the real `SessionData` augmentation (`userId`, `phoneNumber`, `userState`, `accessToken`, `packages`).
- `location.fixture.ts` — `createLocation` + `ORIGIN_LOCATION` / `DESTINATION_LOCATION` (string lat/lng, matching `Location`).
- `index.ts` barrel.

Fixtures are used by phases 2–5; existing specs migrate to them as each module is touched.

### 2.6 Documentation ✅
Created `docs/` set: `CODEBASE-AUDIT.md`, `REFACTORING-PLAN.md`, `CONVENTIONS.md`, `TESTING-STRATEGY.md`, `BREAKING-CHANGES.md`, this file.

### 2.7 Dead e2e scaffold ⏳
`test/app.e2e-spec.ts` ("Hello World!") is excluded from unit runs by the fixed `testRegex`; it is removed in Phase 6 together with the new e2e suite (kept for now so `test/jest-e2e.json` stays meaningful).

## 3. Baseline Metrics (scoped, after this phase's tooling fixes)

| Metric | Baseline | Phase 6 Target |
|---|---|---|
| Statements | **68.13%** | 100% |
| Branches | **59.82%** | ≥ 95% |
| Functions | **41.80%** | 100% |
| Lines | **67.53%** | 100% |
| Suite runtime | 514 s → **~20 s** | — |
| Test suites | 28 passed / 205 tests | re-implemented by module phases |

## 4. Validation Performed

- `npm install` — clean.
- `npx tsc --noEmit` — exit 0 (no type regressions from the `utilities.ts` rewrite or fixtures).
- `npm run lint` — runs with the new type-checked flat config (results below).
- `npm run test:cov` — 28 suites / 205 tests, all passing, scoped coverage report produced.

## 5. Deviations from the original plan

- The global `coverageThreshold` block was **not** added yet — with a 41.8% function baseline it would fail CI immediately. Thresholds are enforced per-module as each phase completes and globally in Phase 6 (as recorded in `REFACTORING-PLAN.md §3`).
- Removal of the scaffold e2e spec deferred to Phase 6 (see 2.7).

## 6. Checklist (Definition of Done)

- [x] Jest config scoped + coverage reproducible
- [x] Baseline measured and recorded
- [x] ESLint flat config added, lint runs
- [x] `moment` removed, `jest-mock-extended` in devDependencies
- [x] Shared fixtures created
- [x] Docs set created
- [x] tsc + tests + lint validated
