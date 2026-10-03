# Testing Strategy

> Target policy for the whole refactor. Phase 1 sets up the infrastructure; phases 2–5 re-implement tests module by module; Phase 6 adds integration tests and switches on the hard global gate.

## 1. Coverage Policy

| Metric | Target | Enforcement |
|---|---|---|
| Statements | 100% | Jest `coverageThreshold.global` |
| Lines | 100% | Jest `coverageThreshold.global` |
| Functions | 100% | Jest `coverageThreshold.global` |
| Branches | ≥ 95% | Jest `coverageThreshold.global` |
| CI gate | fail build below target | `.github/workflows/test-build.yml` (Phase 6) |

**Scope** (`collectCoverageFrom`): `src/**/*.ts`, excluding `src/main.ts` (bootstrap, exercised via integration tests in Phase 6) and `*.module.ts` (declarative DI wiring).

**Baseline (2026-09-02, scoped, commit `ae11d31` + Phase 1 tooling):**

| Metric | Baseline |
|---|---|
| Statements | 68.13% |
| Branches | 59.82% |
| Functions | 41.80% |
| Lines | 67.48% |

Updated after Phase 1 (raw baseline 6.99/1.8/3.51/25.28 was inflated by an incorrect `collectCoverageFrom`
sweeping the whole repo; the scoped numbers above are the real source-tree baseline).
Reproduce with: `npm run test:cov` (see §6).

## 2. Test Types

| Type | Location | Runner | Infra |
|---|---|---|---|
| Unit | `src/**/*.spec.ts` (co-located) | `npm test` | none — everything mocked |
| Integration (Phase 6) | `test/integration/*.spec.ts` | `npm run test:integration` | real Postgres + Redis (Docker Compose in CI) |
| E2E (Phase 6, selective) | `test/e2e/*.spec.ts` | `npm run test:e2e` | real Postgres + Redis + mocked externals |

The old scaffold `test/app.e2e-spec.ts` ("Hello World!") is excluded from unit runs (fixed `testRegex`) and
removed in Phase 6, replaced by real e2e smoke specs.

## 3. Unit Test Conventions

### 3.1 Structure
- One spec file per production file, co-located: `token.service.ts` → `token.service.spec.ts`.
- `describe('<ClassName>')` → nested `describe('<method>')` → `it('should <behavior> when <condition>')`.
- Arrange–Act–Assert; no test logic in constructors/hooks beyond wiring.

### 3.2 Mocking standards
- Class dependencies: `mockDeep<T>()` from `jest-mock-extended`.
- Infra ports (Phase 5+): hand-written in-file fakes implementing the port interface.
- Module-level mocks (`jest.mock(...)`) only for impure utilities (`generateCode`, crypto) — prefer injecting fakes.
- `clearMocks: true` is set globally — every test must re-stub what it needs (no cross-test stub leakage).

### 3.3 Fixtures
- Shared factories live in `test/fixtures/*.fixture.ts` (`createMockUser`, `createMockSession`, `createLocation`, …).
- Factories return **fresh deep objects per call**; module-level exported constants are read-only conveniences.
- Never mutate shared constants; create your own instance: `createMockUser({ role: RolesEnum.admin })`.

### 3.4 Determinism
- Time-dependent tests: `jest.useFakeTimers().setSystemTime(...)` or inject a clock (Phase 3 OTP tests).
- Randomness (`generateCode`, `generateUniqueCode`): spy on the crypto-backed utility or assert on range/format, not exact values.
- No test may hit the network, require env secrets, or require Postgres/Redis. CI unit job runs with **no secrets**.

### 3.5 What "100%" means in practice
- Every public method happy path **and** every explicit error/throw path is asserted (exception type + message).
- Every branch that represents behavior (null checks, env fallbacks, status transitions) is exercised on both sides.
- Defensive-only branches (e.g. impossible states behind `instanceof` for third-party internals) may be excluded via `/* istanbul ignore next */` **with an explanatory comment** — target is ≥95% branches precisely to allow a small, documented residue.
- Controller tests must assert delegation **and** response mapping — not just "returns the mock".

## 4. Module Test Plans

Detailed per-phase checklists live in the phase docs. Coverage expectations per module are tracked in the master plan's progress tracker.

## 5. CI

- **Phase 1:** CI runs `npm test` (unit) — now **~20 s** instead of 514 s — plus `npm run lint` and `tsc --noEmit`.
- **Phase 6:** CI gains a coverage report artifact + `coverageThreshold` gate, then the integration job (Postgres/Redis services) running `prisma db push` + `npm run test:integration`.

## 6. Commands

```bash
npm test                      # unit tests (watch mode: npm run test:watch)
npm run test:cov              # unit tests + coverage report (baseline reproduction)
npm run lint                  # type-checked ESLint (flat config)
npx tsc --noEmit              # full type check (ts-jest runs isolated, type safety lives here)
```

## 7. Known Trade-offs

- `ts-jest` runs with `isolatedModules: true` for speed (514 s → 28 s). Type errors in test files are caught by `tsc --noEmit` and ESLint's type-checked rules, which the CI also runs.
- `*.module.ts` and `main.ts` are excluded from coverage targets; their logic is validated by integration tests (Phase 6).
