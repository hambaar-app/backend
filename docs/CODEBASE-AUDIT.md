# Hambaar Backend — Codebase Audit

> **Date:** 2026-09-02 · **Baseline commit:** `ae11d31` (master) · **Scope:** full `src/`, `prisma/`, CI, Docker, tooling
>
> This document is the evidence-based foundation of the refactoring plan (`REFACTORING-PLAN.md`).
> Severity legend: 🔴 Critical · 🟠 High · 🟡 Medium · 🔵 Low / hygiene

---

## 1. Project Snapshot

| Item | Value |
|---|---|
| Framework | NestJS 11, Express 5, TypeScript 5.7 |
| ORM / DB | Prisma 6 + PostgreSQL (`prisma db push`, **no migration history**) |
| Cache / Session | Redis 5.x (`cache-manager` + `@keyv/redis`, `express-session` + `connect-redis`) |
| Storage | AWS S3 (pre-signed URLs) |
| External APIs | Neshan Maps, SMS (s.api.ir) |
| Source size | ~153 TS files, 17 feature modules |
| Tests | ~40 `*.spec.ts` files (shallow), 1 trivial e2e spec |

**Module inventory:** app, auth, user, vehicle, token, s3, sms, address, package, trip, map, financial, support, notification, dashboard, pricing, turf, health, prisma.

---

## 2. Architecture Issues

### A-1 🔴 God services (business logic monoliths)
| File | Size | Injected deps | Problems |
|---|---|---|---|
| `src/modules/trip/trip.service.ts` | **32.6 KB** | 6 | CRUD + request lifecycle + tracking + rating + financial escrow + S3 + geo + notifications in one class |
| `src/modules/package/package.service.ts` | **22.2 KB** | 8 | Recipients, items, pricing, matching orchestration, requests, cancellation, tracking — one class |
| `src/modules/auth/auth.service.ts` | **14.9 KB** | 8 | OTP, signup, documents, session state machine — one class |

Controllers receive raw Prisma models; services contain business rules, persistence queries, external-API calls, session mutation, and notification side effects simultaneously.

### A-2 🔴 Layering violations
- Controllers receive raw Prisma entities (no response mapping consistently; `instanceToPlain`/`plainToInstance` used ad-hoc).
- `MapService` (infrastructure client) depends on `PrismaService` and performs DB lookups (`getIntermediateCitiesWithIds`) — infra layer reaching into the data layer.
- `SerializeInterceptor` exists (`src/common/serialize.interceptor.ts`) but is used in only one place (`health.controller.ts`); the rest of the API returns unfiltered entity objects (internal-field exposure risk).

### A-3 🟠 Repeated transaction/error boilerplate
Every service repeats:
```ts
this.prisma.$transaction(async tx => { ... })
  .catch((error: Error) => { formatPrismaError(error); throw error; });
```
and every `find*OrThrow` call wraps the same `.catch(formatPrismaError)` — dozens of duplicated blocks. `formatPrismaError` is declared to return `never` and always throws, yet every caller still does `throw error` after it (unreachable code).

### A-4 🟠 Session-as-database anti-pattern
Matching results, packages-in-progress, and user state are stored in **express-session** (`session.packages[].matchResults[]`, `session.userState`) — e.g. `matching.service.ts`, `package.service.ts#cancelRequest`, `auth.service.ts#getUserState`. Session mutations are not transactional with DB writes; `cancelRequest` mutates the session inside a Prisma transaction (Redis store is outside the tx — inconsistency risk).

---

## 3. Security Issues

### S-1 🔴 CORS reflects any origin with credentials
`src/main.ts:16-19`: `app.enableCors({ origin: true, credentials: true })` — mirrors the request origin; combined with cookie-based auth (`AccessToken`, `SessionId` cookies) any website can make credentialed requests.

### S-2 🔴 Session cookie `secure: false` in all environments
`src/modules/app/app.module.ts:94` — with an explicit `// TODO: Fix this when you deploy on a https server`.

### S-3 🟠 Access token lifetime: 20 days, no refresh/rotation
`src/modules/token/token.service.ts:27` — `expiresIn: '20d'`, no rotation mechanism, no server-side revocation.

### S-4 🟠 No per-IP rate limiting
Only OTP-level attempt throttling exists (`AuthService.checkIfBlocked`). `sendOtp` and other SMS-triggering endpoints have no `ThrottlerGuard`/IP limits — SMS-bombing risk with direct cost.

### S-5 🟠 No security headers; Swagger unauthenticated in prod
No `helmet`/CSP; Swagger UI exposed at `/docs` in production.

### S-6 🟡 OTP entropy bias
`src/common/utilities.ts:20` — `crypto.randomInt(11_111, 99_999)`: 5-digit numeric OTP where the first digit can never be 0 or 1 (~11% of the code space excluded) and codes are not zero-padded to a fixed width.

### S-7 🟡 `generateUniqueCode` weakness
`src/common/utilities.ts:24` — `Date.now().toString() + crypto.randomInt(1_111_111, 9_999_999)` — not guaranteed unique (no uniqueness check demonstrated), biased numeric range.

### S-8 🟡 Tracking endpoint leaks sender phone number
`package.service.ts#getTrackingByCode` returns `sender.phoneNumber` to anyone holding a tracking code (route has no auth guard) — PII exposure.

---

## 4. Configuration & Bootstrap Issues

### C-1 🔴 Env config bug: trailing space in key
`src/modules/auth/auth.service.ts:50`:
```ts
this.maxSendAttempts = config.get<number>('MAX_SEND_ATTEMPTS ', 5);
```
The env key `'MAX_SEND_ATTEMPTS '` has a **trailing space** — the real env var is never read; the default (5) silently applies. There is **no config validation schema**, so this class of bug is undetectable at boot.

### C-2 🔴 Redis client created inside `AppModule.configure()`
`src/modules/app/app.module.ts:74-99`:
- `configure()` is declared `async` but Nest does not await it — the session middleware may attach **after** the app starts listening (race).
- Bootstrap serializes on Redis availability with no error handling/retry.
- Session Redis client lifecycle is unmanaged (no shutdown/`client.quit()`).

### C-3 🟠 Fragile positional cache store access
`auth.service.ts:47`: `this.cacheManager = cacheManager.stores[1];` — silently breaks if the store order in `app.module.ts` changes; no named-store abstraction.

### C-4 🟠 Missing env validation + config drift
`ConfigModule.forRoot` has no `validationSchema`; every `config.get(..., default)` silently masks missing/typo'd variables (see C-1). Pricing defaults in code **differ from** README docs (e.g. `PRICING_WEIGHT_BASE_RATE` default 10000 vs README 8000; `PRICING_PLATFORM_COMMISSION` env var documented but unused — commission derived from `driverShare`).

### C-5 🟡 Bootstrap hygiene (`src/main.ts`)
- No global prefix / versioning (`/api/v1`).
- No graceful shutdown (`app.enableShutdownHooks()` absent).
- `bootstrap()` not awaited / no top-level catch → unhandled rejection on startup failure.
- No compression; PORT not validated.

### C-6 🟡 Health check depends on an external website
`health.controller.ts:37` — `http.pingCheck('nestjs-docs', 'https://docs.nestjs.com')`: production readiness depends on nestjs.com and generates outbound traffic per poll; memory heap threshold hardcoded.

### C-7 🔵 Prisma managed by `db push`; `prisma/.env` committed
`prisma db push` runs on every `start:dev` and on every container start (`entrypoint.sh`); no migration history; `prisma/.env` (with DB URL) is committed.

---

## 5. Code Smells & Correctness Risks

### B-1 🔴 Private method accessed via bracket notation
`auth.service.ts:371`: `this.tokenService['generateAccessToken'](payload)` — TypeScript visibility deliberately bypassed; hides the real public API of `TokenService`.

### B-2 🟠 `request.user` mutation order bug risk
Guards assign `request.user = { id: payload.sub, ...request.user }` (`token.guard.ts:50-53, 79-82`) — the spread **after** means an existing `request.user.id` (if any) overwrites the verified `payload.sub`. `CurrentUser` decorator reads `request.user?.[key]` with a string key — no type safety.

### B-3 🟠 Duplicated guard logic
`TemporaryTokenGuard`, `ProgressTokenGuard`, `AccessTokenGuard`, `MultiTokenGuard`, `DenyAuthorizedGuard` share ~80% of their logic (cookie extract → verify → compare to session → set user) with divergent error messages and subtly different payload checks.

### B-4 🟡 Silent failure swallowing + console logging
`matching.service.ts:55-58` — `analyzeTrip(...).catch(error => { console.error(...); return null; })` inside `Promise.allSettled`; `console.error/warn` used across `map.service.ts`, `sms.service.ts`, `utilities.ts`. No Nest `Logger` anywhere, no structured logging, no request correlation IDs.

### B-5 🟡 Commented-out / dead code
`sms.service.ts:46-50` (commented OTP message), `token.service.ts:26,31,36` (pointless local aliases), commented `secure` cookie line, `// TODO` markers (payment gateway, departure-time filter, waypoint sorting, S3 upload limit).

### B-6 🟡 Mixed date libraries
Both `moment` (legacy) and `date-fns` are dependencies; `moment` is used only in `utilities.ts#getDateDifference` — replaceable with `date-fns` (also calendar-inaccurate `asMonths() % 12` math).

### B-7 🟡 Dependency hygiene
- `jest-mock-extended` is a **production dependency** (belongs in devDependencies).
- `cookie-parser` middleware is applied **after** the session middleware (`app.module.ts:101-104`) — parser should run before anything that reads cookies.
- `prisma/.env` committed to the repository.

### B-11 🔴 (found during Phase 1) No ESLint configuration at all
The repo has **no ESLint config file** (no `eslint.config.*` / `.eslintrc.*`), so `npm run lint` fails — linting has never been enforced despite the CI narrative. Fixed in Phase 1 with a type-checked flat config.

### B-12 🟠 (found during Phase 1) Test suite runtime & teardown leaks
Baseline `npm run test:cov` took **514 s** on a dev machine with worker force-exit warnings ("worker process has failed to exit gracefully") — ts-jest full type-checking per file plus leaked handles. Fixed in Phase 1 via `isolatedModules` transform (28 s) — type safety is enforced by `tsc --noEmit` and the new ESLint type-checked config instead.

### B-8 🟡 Untyped helpers
`toPersianDigits(number)` has no type annotation; `getDateDifference` approximates calendar math; `utilities.ts` mixes concerns (crypto codes, Prisma error mapping, validators, formatting) in one 7.3 KB file.

### B-9 🔵 Internal Prisma runtime import
`package.service.ts:16` — `import { JsonArray } from '../../../generated/prisma/runtime/library'` — internal path, breaks across Prisma versions.

### B-10 🔵 Pricing tier arithmetic fragile
`pricing.service.ts:141` — `tier.maxKm - tier.minKm + (tier.minKm ? 1 : 0)` correct only for the current 1-based inclusive bounds; silently wrong if tier bounds change.

---

## 6. Testing Issues

### T-1 🔴 Coverage unmeasured and unenforced
`package.json#jest`: `collectCoverageFrom: ["**/*.(t|j)s"]` with `rootDir: "."` — coverage sweeps the entire repo; **no `coverageThreshold` at all**; CI runs `npm test` without coverage.

### T-2 🔴 Controller tests assert nothing meaningful
Every `*.controller.spec.ts` mocks the service with `jest-mock-extended` and verifies that a method that just delegates returns its mock verbatim. Guards are stubbed with `canActivate: () => true`. These tests verify wiring, not behavior.

### T-3 🟠 No tests for the highest-risk logic
Zero unit tests for: all guards, `token.service.ts`, `utilities.ts` (`formatPrismaError` — the app-wide error mapping!), validators (`IsValidS3Key`, datetime tuples), `serialize.interceptor.ts`, `matching.service.ts` scoring, `map.service.ts` parsing, `s3.service.ts`, `sms.service.ts`.

### T-4 🟠 Inconsistent test styles
Some specs use `Test.createTestingModule` + `DeepMockProxy`, others hand-rolled `jest.fn()` objects (`auth.service.spec.ts` builds a manual `keyvMock`); no fixture builders; magic mock data inline.

### T-5 🟡 e2e suite is the scaffold default
`test/app.e2e-spec.ts` asserts `getHello()` returns "Hello World!" — dead weight.

### T-6 🟡 CI unit tests run with all prod secrets set
`test-build.yml` exposes AWS/JWT/session secrets to the unit-test job — masks accidental secret/network usage and violates least privilege.

---

## 7. Observability & Ops

- **O-1 🟠** No structured logger: `console.*` everywhere; no request-ID/correlation; Nest `Logger` unused.
- **O-2 🟡** No metrics/tracing; health endpoint only.
- **O-3 🟡** `Dockerfile`/`entrypoint.sh` run `prisma db push` + seeds on **every container start** (prod image mutates DB schema at boot, seeds via `concurrently`).
- **O-4 🔵** `.dockerignore` present (good); `dist/` exists locally (verify `.gitignore`).

---

## 8. Positive Findings (keep)

- Clean NestJS module folder boundaries; global `ValidationPipe` with `whitelist`/`transform`.
- `formatPrismaError` centralizes Prisma → HTTP error mapping (right concept, wrong ergonomics).
- OTP rate-limiting state machine (send/check attempts, block windows) is a thoughtful feature.
- Pre-signed URL upload flow with S3-key pattern validation (`IsValidS3Key`).
- `OwnershipGuard` with Reflector metadata; Turf.js corridor matching is a solid domain concept.
- Redis-backed sessions in prod; Docker + CI pipeline exists.

---

## 9. Baseline Metrics

*Filled after the Phase 1 baseline coverage run (see `TESTING-STRATEGY.md` for how it is reproduced).*

| Metric | Baseline (2026-09-02) | Phase 6 Target |
|---|---|---|
| Statements % | 68.13 | 100% |
| Functions % | 41.80 | 100% |
| Lines % | 67.48 | 100% |
| Branches % | 59.82 | ≥ 95% |
| CI coverage gate | none | enforced |
| ESLint strict type-checked | no (added in Phase 1) | yes (0 errors) |

---

## 10. Issue → Phase Mapping

| Issue(s) | Phase |
|---|---|
| T-1…T-6, B-11, B-12 | Phase 1 |
| C-1…C-7, S-1…S-5, B-5, B-7 (cookie-parser order), O-1, O-3 | Phase 2 |
| A-1 (auth), A-3, A-4, B-1, B-2, B-3, S-6, S-7 | Phase 3 |
| A-1 (package/trip), A-2, A-3, A-4, B-4, B-9, B-10, S-8 | Phase 4 |
| remaining modules, infra adapters (S3/SMS/Maps) | Phase 5 |
| O-2, integration tests, final gates | Phase 6 |

---

## 11. Decision Log (from product owner)

| Decision | Choice |
|---|---|
| Backward compatibility | Mostly compatible; documented breaking changes allowed (frontend can be updated) |
| Database | Keep `prisma db push` and current schema; **application code only** |
| Refactor depth | Full professional restructure (domain layer, thin controllers, infra adapters, strategies) |
| Coverage policy | 100% statements/functions/lines, ≥95% branches, enforced by Jest thresholds + CI |
| Test types | Unit tests (fully mocked) + integration tests on real Dockerized Postgres/Redis in CI |




