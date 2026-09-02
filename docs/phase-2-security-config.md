# Phase 2 — Bootstrap, Config & Security

> **Status:** ⬜ Not started · **Spec version:** 1.0 (2026-09-02)
>
> **Audit issues in scope:** C-1…C-7, S-1…S-5, A-3 (filter part), B-2, B-3, B-5, B-7, O-1, O-3.
> **Docs:** [CONVENTIONS.md](./CONVENTIONS.md) (layering), [BREAKING-CHANGES.md](./BREAKING-CHANGES.md) (this phase adds its first real entries).

## 1. Objective

Make the application boot **professionally and securely** without touching business logic:
typed configuration that fails fast, safe-by-default HTTP settings, structured error handling
replacing the copy-pasted `.catch(formatPrismaError)` pattern, consolidated auth guards,
and a working rate limiter.

## 2. Dependencies to add

| Package | Why |
|---|---|
| `helmet` | HTTP security headers (S-5) |
| `compression` | gzip responses |
| `@nestjs/throttler` | per-IP rate limiting (S-4) |

`npm i helmet compression @nestjs/throttler`

---

## 3. Task 1 — Typed configuration (`src/common/config/`)

### 3.1 Env validation schema
Create `src/common/config/env.validation.ts` using `class-validator` + `plainToInstance` via
`ConfigModule.forRoot({ validate })`. Schema covers **every** env the app reads:

```ts
// Required
DATABASE_URL, REDIS_URL, OTP_REDIS_URL, SESSION_REDIS_URL,
SESSION_SECRET, COOKIE_SECRET,
JWT_ACCESS_SECRET_KEY, JWT_TEMP_SECRET_KEY, JWT_PROGRESS_SECRET_KEY,
AWS_ACCESS_KEY, AWS_SECRET_KEY, AWS_BUCKET_NAME, AWS_ENDPOINT,
MAP_API_KEY, MAP_API_URL, SMS_API_KEY
// Optional with validated types/range
PORT, COOKIE_MAX_AGE, OTP_EXPIRATION_TIME, MAX_SEND_ATTEMPTS, MAX_CHECK_ATTEMPTS,
SEND_WINDOW, BASE_BLOCK_TIME, PRICING_*, CORRIDOR_WIDTH, AWS_REGION,
CORS_ORIGINS, THROTTLE_TTL, THROTTLE_LIMIT, API_PREFIX, LOG_LEVEL
```

- **Strategy:** production-like environments (CI, prod) use strict mode (missing required → boot fails).
- **Dev:** `.env.development` supplies values; missing optional keys fall back to existing code defaults.
- **Action:** replace `ConfigModule.forRoot` in `app.module.ts` with `forRoot({ isGlobal: true, validate, envFilePath })`.
- **Fix C-1 permanently:** the schema surfaces the trailing-space key immediately; Phase 3 rewires `AuthService` to the canonical key.

### 3.2 Typed config access
- Add `src/common/config/config-names.ts` exporting **const objects** for the stringly-typed keys
  (`ConfigKey.Pricing.BasePrice`, `ConfigKey.Auth.MaxSendAttempts`, …) to eliminate typos.
- Migrate only **bootstrap/shared** consumers in Phase 2 (services are migrated in their own phase).

### 3.3 Unit tests — `env.validation.spec.ts`
- valid full env → passes
- each required key missing → fails with a message naming the key
- invalid value types (e.g. `PORT=abc`) → fails
- JWT secrets too short (<16 chars) → fails (new security rule)

---

## 4. Task 2 — `main.ts` bootstrap

Rewrite `src/main.ts` to a single, testable function.

### 4.1 New bootstrap behavior
| Concern | Change |
|---|---|
| Security headers | `app.use(helmet())` |
| Compression | `app.use(compression())` |
| CORS | `origin: parseCorsOrigins(config)` from `CORS_ORIGINS` (comma-separated; **never** `true`) — fixes **S-1** |
| Global prefix | `app.setGlobalPrefix(config.get('API_PREFIX', 'api'))` — env-controlled, see Breaking Changes |
| Validation | global `ValidationPipe` moved here (and to a provider) with `forbidNonWhitelisted` |
| Shutdown | `app.enableShutdownHooks()` — fixes **C-5** |
| Swagger | mounted only when `NODE_ENV !== 'production'` — fixes **S-5** |
| Logging | Nest `Logger` instead of `console.log` — fixes **O-1** |
| Startup errors | `void bootstrap().catch(...)` — top-level catch — fixes **C-5** |

### 4.2 Cookie helpers
Create `src/common/cookies/cookie-options.ts` (`getCookieOptions(config)`): one place for
`httpOnly: true`, `secure: config.get('COOKIE_SECURE', NODE_ENV === 'production')`, `sameSite`
from env, `maxAge`. **Fixes S-2** and the duplicated cookie objects in `auth.controller.ts`
(two more sites; deep links listed in Phase 3).

### 4.3 Tests
`main.ts` is excluded from unit coverage (integration-covered in Phase 6); extract pure helpers
(`parseCorsOrigins`, `buildSwaggerConfig`, `isSwaggerEnabled`) into `src/common/http/bootstrap-options.ts`
and unit-test them at 100%.

---

## 5. Task 3 — Session & middleware lifecycle (`src/infra/session/`)

Fix **C-2** and **B-7 (parser order)**:
1. `src/infra/session/session.constants.ts` — `SESSION_STORE_PROVIDER` token.
2. `src/infra/session/session.provider.ts` — an async factory that creates the Redis client,
   returns a `{ client, store, middleware }`, and registers `onApplicationShutdown` → `client.quit()`.
3. New global `SessionModule` wires **cookie-parser first**, then session middleware via
   `MiddlewareConsumer` — done **synchronously** (no async `configure()`).
4. `app.module.ts` drops its `configure()` Redis setup entirely — it becomes a pure composition root
   (first half of O-3).

Tests: `session.provider.spec.ts` (fake redis client: connection, store construction, quit-on-shutdown),
`session.module.spec.ts` (middleware order assertion).

---

## 6. Task 4 — Consolidated auth guards (`src/common/guards/`)

Fix **B-2** and **B-3**:
1. `token.guard.base.ts` — `abstract BaseTokenGuard`:
   - cookie name provided by subclass
   - `verify()` delegates to `TokenService`
   - session phone/sub comparison policy provided by subclass
   - **fixed** `request.user` merge: `{ ...request.user, id: payload.sub }` (verified id is never overridden) — **B-2**
   - injectable `MissingToken` / `InvalidToken` messages
2. Refactor the five guards to extend it (same public class names, same behavior/messages).
   - `DenyAuthorizedGuard` keeps its inverse semantics (throws `BadRequestException(AlreadyAuthorized)`).
3. Move guard files under `src/common/guards/`; the legacy paths
   (`auth/guard/token.guard.ts`, `multi-token.guard.ts`, `deny-authorized.guard.ts`, `ownership.guard.ts`)
   become re-exports until Phase 3 removes them.

Tests — **first 100% guard coverage** (audit T-3):
- each of the 5 guards: missing cookie, invalid token, expired token, phone mismatch, phone/sub match
  sets `request.user.id` correctly
- `DenyAuthorizedGuard`: valid session → 400 `AlreadyAuthorized`; no/invalid token → pass-through
- `OwnershipGuard`: no config → true; no user → 403; admin → true; missing `:id` param → 400;
  un-owned resource → 403 `EntityAccessDenied`; invalid entity name → error; Prisma failure → 403 fallback

---

## 7. Task 5 — Global filters, interceptor, error envelope

### 7.1 `PrismaErrorMapper` (pure — replaces the mapping half of `formatPrismaError`)
`src/common/errors/prisma-error-mapper.ts` returns `{ status, message }` per Prisma code
(P2000/P2002/P2003/P2004/P2025/P2016/validation/unknown) using the **exact** messages the current
`utilities.ts#formatPrismaError` produces (behavior-preserving), plus a `default` 500 branch.
`formatPrismaError` stays as a thin wrapper (still used by services until Phase 4 refactors them away).

### 7.2 `AllExceptionsFilter`
`src/common/filters/all-exceptions.filter.ts`: `HttpException` → existing envelope unchanged;
Prisma errors → `PrismaErrorMapper`; unknown → 500 with `requestId` (from `RequestIdMiddleware`)
and a log line. Response keeps `{ statusCode, message, error }`.

### 7.3 `TransformInterceptor` (optional success envelope)
`src/common/interceptors/transform.interceptor.ts` wraps success into `{ data }` **only when**
`RESPONSE_WRAPPER_ENABLED=true` (default off → byte-compatible responses). Opt-in to avoid
breaking the frontend before coordination (entry recorded in `BREAKING-CHANGES.md`).

### 7.4 `RequestIdMiddleware` + `LoggingInterceptor`
Assign `req.id` (from `crypto.randomUUID()` or incoming `X-Request-Id`), log method/path/status/duration
via Nest `Logger`. Fixes **O-1**.

### 7.5 `TimeoutInterceptor`
`TIMEOUT_MS` env (default 30s) → `TimeoutException` (504).

Tests: `prisma-error-mapper.spec.ts` (every code + odd `meta` shapes), `all-exceptions.filter.spec.ts`
(every exception type, requestId present, prod/dev log behavior), `transform.interceptor.spec.ts`
(enabled/disabled, arrays, null), logging + timeout specs.

---

## 8. Task 6 — Rate limiting (`@nestjs/throttler`)

- `ThrottlerModule.forRootAsync` with `THROTTLE_TTL` / `THROTTLE_LIMIT` (env; sane defaults).
- Applied globally; OTP endpoints keep their domain-level throttling in `AuthService`
  (Phase 3) — the global limiter protects the remaining endpoints (S-4).

## 9. Task 7 — Health endpoint hardening (C-6)

- Remove the `nestjs-docs` external `pingCheck` (unnecessary outbound traffic per poll).
- `MEMORY_HEAP_THRESHOLD_MB` env for the heap check.
- Keep DB + Redis indicators (each points at real infra).

Test: `health.controller.spec.ts` re-implemented (stubbed `HealthCheckService`).

---

## 10. Breaking changes (this phase)

| # | Change | Frontend action |
|---|---|---|
| 2.1 | CORS now requires explicit `CORS_ORIGINS` — requests from unlisted origins are blocked | Provide frontend origin(s) to backend env |
| 2.2 | Validation 400s: unknown body fields now rejected (`forbidNonWhitelisted`) | Do not send fields not in the DTOs |
| 2.3 | `API_PREFIX` (default `api`) — all routes move under `/api/…` | Update API base URL (coordinate on the value) |
| 2.4 | Swagger disabled in production | (n/a unless docs are needed in prod) |
| 2.5 | Rate limiter returns 429 beyond `THROTTLE_LIMIT` per `THROTTLE_TTL` | Respect 429 + `Retry-After` |

> 2.2 and 2.3 land only **after** frontend coordination (documented decision log). Everything else is safe-by-default.

---

## 11. Definition of Done (checklist)

- [ ] Config schema active in `app.module`; CI/prod boot fails on missing required env vars
- [ ] `main.ts` hardened (helmet, compression, CORS env, prefix, shutdown hooks, swagger gate, logger)
- [ ] Session provider replaces async `configure()`; cookie-parser registered before session
- [ ] Guards consolidated with zero message/behavior change; all guard specs at 100%
- [ ] `AllExceptionsFilter` + `PrismaErrorMapper` at 100%; validation errors standardized
- [ ] Throttler active
- [ ] Health external ping removed
- [ ] `tsc` exit 0, lint 0 errors, `npm test` green; Phase-2-touched modules 100/100/100/95
- [ ] `BREAKING-CHANGES.md` updated; phase doc as-built filled in

---

## 12. As-built notes

*(Filled when the phase completes — record deviations, actual coverage numbers, timings.)*