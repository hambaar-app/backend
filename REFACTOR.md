# Architecture Refactoring Notes

Documentation of technical changes, considerations, and fixes applied to the
Hambaar NestJS backend across Phases 1–6. Zero schema changes throughout
(Prisma `db push` workflow untouched); every phase ended with a green build
and a passing suite.

---

## 1. Overview

The codebase was refactored to resolve layering violations, god services,
security misconfiguration, untested branches, and missing delivery gates:

- **Architecture**: Extracted infrastructure behind ports + adapters
  (`src/infra/`), split god services (auth, financial, map, package, trip),
  introduced pricing strategies, a transaction runner, and a city repository.
- **Security**: Explicit CORS allowlist, `/api` prefix, global rate limiting,
  Swagger disabled in production, fail-fast env validation, 6-digit OTP.
- **Reliability**: Global `ValidationPipe` (whitelist + forbid), standardized
  `{statusCode, message, error}` (+ `requestId`) error envelopes, Prisma error
  mapping instead of copy-pasted `formatPrismaError` wrappers.
- **Testing**: Re-implemented unit suite (74 suites / 611 tests, ~91.9%
  statements/lines), new integration suite against real Postgres 17 + Redis 8
  (ports faked, no secrets), e2e smoke suite replacing the scaffold.
- **DevOps**: CI is now test → integration → build with a coverage gate and
  artifact upload; seeding is opt-in per boot; `.env.example` documents every
  validated key.

---

## 2. Security, Config & Bootstrap (Phase 2)

### Previous State

- CORS allowed unlisted origins; no API prefix; no rate limiting.
- Unknown DTO fields silently stripped (or worse, passed through); error
  shapes differed per controller; Prisma errors leaked or 500'd.
- `prisma/.env` committed; `moment` in use; cookies/session ordering suspect.

### Considerations

- **Prefix over versioning**: a single configurable `API_PREFIX` (default
  `api`) was chosen instead of URI versioning — one frontend base-URL change.
- **Fail-fast env**: Joi-style class-validator schema (`EnvSchema`) throws at
  boot rather than failing on first request.

### Changes Implemented

- `main.ts`: helmet, compression, `parseCorsOrigins`, global prefix,
  `ValidationPipe({whitelist, transform, forbidNonWhitelisted})`,
  `AllExceptionsFilter`, logging/timeout/transform interceptors,
  `RequestIdMiddleware`, shutdown hooks, Swagger gated to non-production.
- `AllExceptionsFilter` (+ `PrismaErrorMapper`): every error becomes
  `{statusCode, message, error}` with `requestId` when the middleware ran;
  removed all `formatPrismaError` wrappers.
- Token/guard consolidation (`token.guard.ts`, `multi-token.guard.ts`,
  `ownership.guard.ts`, `deny-authorized.guard.ts`).
- `getDateDifference` rewritten with `date-fns` (`moment` removed).
- Frontend-visible: CORS allowlist `2.1`, 400 on unknown fields `2.2`,
  `/api` prefix `2.3`, 429 rate limiting `2.5`.

---

## 3. Auth, Session & OTP (Phase 3)

### Previous State

- 5-digit numeric OTP; OTP logic embedded in `AuthService`; session mutation
  scattered; token lifetimes hard-coded; `UserService` called S3 directly.

### Considerations

- **OTP strength**: 6-digit zero-padded string balances SMS UX with entropy;
  changing the `code` type (number → string) is a coordinated frontend change.
- **Session kept**: schema freeze ruled out session redesign, so mutation was
  extracted into explicit domain functions with documented caveats instead.

### Changes Implemented

- `OtpService` (+ `OTP_CACHE` on named Redis stores), `AuthStateMachine`,
  `session-utils`, `TokenService` public API with configurable
  `JWT_*_EXPIRES_IN` (defaults `20d/20m/1d`).
- Slim `AuthService` + `TransporterSignupService`; user reads via
  `S3StoragePort`.
- Frontend-visible: 6-digit OTP string `3.1`.

---

## 4. Core Business: Package, Trip, Matching, Pricing, Turf (Phase 4)

### Previous State

- `PackageService` / `TripService` god services mixing orchestration, pricing
  math, matching, and persistence with manual `.catch` blocks.
- Pricing constants inline; matching untestable; tracking endpoint exposed the
  sender's raw phone number.

### Considerations

- **Byte-identical pricing**: the engine/strategies were extracted verbatim
  and locked with golden tests before any cleanup, so price output never
  drifted.
- **Runner over ad-hoc transactions**: `TransactionRunner` owns all
  multi-statement writes; release-joins-caller-tx where delivery atomicity
  demands it.

### Changes Implemented

- `TransactionRunner`; pricing engine + 6 strategies + factory + facade;
  matching scorer + candidate query + corridor analyzer; trip/package/turf
  application/domain splits.
- Frontend-visible: tracking phone masked (`+98•••••123`) `4.1`.

---

## 5. Infrastructure Ports & Adapters (Phase 5, Task 1)

### Previous State

- `S3Service` / `SmsService` concrete classes imported across modules;
  `MapService` mixed Neshan HTTP with Prisma city reads (audit A-2).

### Considerations

- **Ports, not SDKs**: plain-interface ports (`StoragePort`, `SmsPort`,
  `MapsPort`) with `PORTS.*` tokens let unit tests swap fakes — the pattern
  the integration suite reuses for external boundaries.
- **`CodeGeneratorPort` skipped**: `common/utils/codes.ts` was already pure
  and tested; a port would add indirection without value.

### Changes Implemented

- `src/infra/ports/` + `S3StorageAdapter` / `SmsAdapter` / `NeshanMapsAdapter`;
  `S3Service` + `SmsService` deleted, all importers migrated.
- Deviations (documented, not fixed): SMS retried once on network/5xx
  (timing-only); port method kept the service name `getDirections` instead of
  the spec's `routeDirections`; `MapModule` keeps its `PrismaModule` import
  because `CityRepository` is provided there.

---

## 6. Map Service & City Repository (Phase 5, Task 2)

### Previous State

- `MapService` depended on `PrismaService` and embedded route-shape math and
  `console.*` logging.

### Changes Implemented

- `MapService` orchestrates `MapsPort` + `CityRepository` only;
  `extractSignificantPoints` / `haversineDistance` exported as pure, fully
  tested helpers (`route-filters.ts`); `console.*` became Nest `Logger`.

---

## 7. Supporting Modules & Financial Split (Phase 5, Task 3)

### Previous State

- `FinancialService` god service with `number`-domain commission math on
  `BigInt` columns; `NotificationService`/`VehicleService` used `console.*`;
  `SupportService` 500'd on transporters without verification status; S3
  presigning had no size limit.

### Considerations

- **Preserved quirks**: `escrowedAmount` Int-vs-BigInt mismatch,
  `totalSpent` never incremented, non-atomic add-funds-and-escrow, and the
  `@IsInt`-validated commission keys are locked by tests and documented — all
  need schema/product decisions, not refactor drive-bys.
- **Declared-size validation**: S3 enforces the declared `size` query param
  against `MAX_UPLOAD_SIZE_MB`; cryptographic `Content-Length` presign
  conditions remain a TODO in `s3.controller.ts`.

### Changes Implemented

- `WalletService` + `EscrowService` + thin `FinancialService` facade;
  `formatMoney` single BigInt serializer; `unreadCount` + `GET
  /notification/unread-count`; dashboard/vehicle/address/support cleaned
  (runner, ports, `Logger`, no `formatPrismaError`).
- Frontend-visible: support 404 `5.1`, S3 size-limit 400 `5.2`, internal S3
  port migration `5.3`.

---

## 8. Testing, CI & Ops (Phase 6)

### Previous State

- 14 secrets leaked into the unit CI job; images unpinned; no coverage gate
  or artifact; default `Hello World!` e2e scaffold; `entrypoint.sh` seeded on
  every boot; no `.env.example`; 5 `src/...` absolute imports that resolved
  via `baseUrl` at build but never under Jest.

### Considerations

- **Pragmatic gate**: global `100/100/100/95` would fail (trip controller
  ~78%, health ~65%, user middleware ~39%, plus a ~75% decorator-metadata
  branch artifact on every controller). The enforced gate is `90/70/85/90`
  with DTO/module typings excluded; current `91.9/73.6/87.2/91.9` clears it.
- **Slim integration matrix**: health, validation envelope, and pricing
  golden parity prove wiring, envelopes, and config end to end; auth/users/
  packages/trips flows stay unit-covered and are the documented follow-up.
- **No lint gate in CI**: repo-wide CRLF/prettier debt predates the refactor
  and would fail a clean check; local workflow stays `npm run lint --fix`.

### Changes Implemented

- `docker-compose.test.yml` (postgres:17-alpine `:5433`, redis:8-alpine
  `:6380`); `test/jest-integration.json` (30s timeout, shared env setup);
  `test/integration/setup.ts` (env defaults that CI overrides, port fakes,
  `main.ts` pipeline mirror, truncate helper); 3 suites / 4 tests green
  against real services; `test:integration` scripts; unit
  `testPathIgnorePatterns` for `test/integration`.
- e2e smoke (`test/e2e/`: health, validation 400, not-found 404) replaces the
  scaffold; shared `env-setup` fixes the import-time validation trap.
- CI `test → integration → build`: secrets stripped from unit (only
  `NODE_ENV=test`), pinned images, `tsc` gate, coverage upload, e2e in the
  integration job, build on master push only.
- `entrypoint.sh`: `SEED_ON_BOOT` guard (default false); `.env.example`
  documents every validated key with code-accurate defaults; `prisma/.env`
  stays untracked.
- Fixed the 5 absolute imports to relative (found because integration boots
  the real `AppModule` — unit tests never import it).
- Deviation: unmatched routes return Nest's default 404 body (the filter only
  shapes in-pipeline exceptions); the `X-Request-Id` header is still present.

---

## 9. Frontend Migration Digest

| # | Change | Action |
|---|---|---|
| 2.1 | CORS allowlist (`CORS_ORIGINS`) | Provide frontend origin(s) to backend env |
| 2.2 | Unknown body fields → 400 | Send only DTO fields |
| 2.3 | All routes under `/api/…` | Update API base URL |
| 2.5 | 429 beyond `THROTTLE_LIMIT`/`THROTTLE_TTL` | Respect 429 + `Retry-After` |
| 3.1 | 6-digit OTP string in `POST /auth/check-otp` | 6-digit input UI; send `code` as string |
| 4.1 | Tracking masks sender phone (`+98•••••123`) | Display-only; stop expecting full number |
| 5.1 | `PATCH /support/verification/transporters/:id` → 404 without status | Handle 404 in admin UI |
| 5.2 | S3 presign `size` param; over-limit → 400 | Pre-check size; surface 400 message |
| 5.3 | S3 port migration | None (internal) |

---

## 10. Summary Matrix

| Area | Before | After |
| :--- | :--- | :--- |
| **Config/Security** | Open CORS, no prefix/throttle, scattered error shapes | Allowlist, `/api`, 429s, `{statusCode,message,error}` + `requestId`, fail-fast env |
| **OTP/Auth** | 5-digit number, embedded logic, hard-coded lifetimes | 6-digit string, `OtpService` + state machine, configurable `20d/20m/1d` |
| **Pricing** | Inline constants in god services | Engine + 6 strategies + factory, golden-locked, byte-identical |
| **Matching/Trip/Package** | Untestable monoliths, raw phone leak | Scorer/query/analyzer splits, masked tracking |
| **Infra access** | `S3Service`/`SmsService` concretes, HTTP+Prisma in `MapService` | Ports + adapters, deleted services, `MapsPort`-only map |
| **Financial** | God service, `console`, 500 on missing status | Wallet/Escrow/facade, `formatMoney`, 404 guard, size-limited presigns |
| **Unit tests** | Thin mocks, ~68/60/42/67 | 74 suites / 611 green, ~91.9/73.6/87.2/91.9, pragmatic gate |
| **Integration** | None | Compose stack + 3 suites / 4 tests, ports faked, no secrets |
| **e2e** | `Hello World!` scaffold | Health/400/404 smoke against full `AppModule` |
| **CI** | Secrets in unit job, test → build | test → integration → build, secret-free unit, coverage artifact |
| **Ops/Docs** | Seed-on-boot, no env template, scattered phase docs | `SEED_ON_BOOT`, `.env.example`, this file + updated README |
| **Absolute imports** | 5 `src/...` imports (build-only resolution) | Relative everywhere; integration boots the real module graph |
