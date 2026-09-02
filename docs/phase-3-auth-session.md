# Phase 3 — Auth, Session & User Domain

> **Status:** ⬜ Not started · **Spec version:** 1.0 (2026-09-02)
>
> **Audit issues in scope:** A-1 (auth god service), A-3 (error boilerplate removal in auth), A-4 (session mutation), B-1 (`tokenService['generateAccessToken']`), B-2 (guard merge fix — completed in Phase 2), B-3 leftovers, S-6 (OTP entropy), S-7 (`generateUniqueCode`), C-1 (trailing-space key).
> **Depends on:** Phase 2 (config, guards, filters).

## 1. Objective

Turn the 15 KB `auth.service.ts` (8 injected deps) into a **thin orchestration service + pure domain
services**, fix the token encapsulation violation, build an explicit auth state machine, and make
OTP handling deterministic and testable. Rewrite the auth/user/token test suites to 100%.

## 2. Target module layout

```
src/modules/auth/
├── auth.module.ts
├── auth.controller.ts            # thin: body → service → cookies via cookie-options helper
├── application/
│   ├── auth.service.ts           # slim orchestrator (sendOtp, checkOtp, signup*, submitDocuments, getUserState)
│   └── transporter-signup.service.ts
├── domain/
│   ├── otp.service.ts            # OTP lifecycle + rate limiting state machine
│   ├── auth-state.machine.ts     # computeTransporterState + transitions
│   └── session-utils.ts          # pure session mutation helpers
├── dto/ guards/ types/           # as today (guards re-export from src/common/guards)
```

---

## 3. Task 1 — `OtpService` (`src/modules/auth/domain/otp.service.ts`)

Move OTP logic out of `AuthService` (sendOtp/checkOtp/attempts/blocking).

### 3.1 Responsibilities
- `generateOtp()` → uses the new `generateSecureOtp()` from `common/utils` (§4.2).
- `startSend(phoneNumber)` / `verify(phoneNumber, code)` implementing the **existing** state machine:
  send attempts, check attempts, `blockedUntil`, send window, expiry — preserve exact current semantics
  (characterization-tested first).
- Reads limits via an injected `OtpConfig` value object (built once from `ConfigService` in the module
  factory) — this also fixes **C-1**: `MAX_SEND_ATTEMPTS` (no trailing space) is the only key read.

### 3.2 Cache store
`AuthService`'s fragile `cacheManager.stores[1]` (C-3) becomes a named provider `OTP_CACHE` token
bound to the OTP Keyv store in `auth.module.ts`. No positional store access anywhere.

### 3.3 Tests — `otp.service.spec.ts`
- send happy path (store + sms called once, attempts incremented)
- OTP not expired → `OtpNotExpired` (401)
- block path: `checkIfBlocked` (429), send-limit (429), check-limit (429)
- expired OTP → `OtpExpired` (401)
- wrong code increments check attempts → block after limit
- SMS failure propagates without caching a usable OTP
- fake timers for `lastSendAttempt`, `expiresIn`, `blockedUntil`

---

## 4. Task 2 — Secure code generation (S-6, S-7)

`src/common/utils/codes.ts` (move + fix):
- `generateSecureOtp()` — **6-digit, zero-padded**: `crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')`.
  Removes the biased `[11111, 99999)` range and yields a uniform 6-digit space. **Breaking change** — see §9.
- `generateUniqueCode()` — keep the format for compatibility but document that uniqueness is **not**
  guaranteed; introduce `generateTripCode()` / `generateTrackingCode()` as **crypto-random 8-char base32**
  (no timestamp prefix) where the DAL unique column enforces uniqueness, with `P2002` retry via
  `TransactionRunner` (Phase 4).
- Remove `moment` remnants (already gone); keep Persian helpers in place.

Tests: `codes.spec.ts` — length/format/padding, range, uniqueness across a large sample,
determinism via a mocked `crypto`.

---

## 5. Task 3 — `TokenService` public API (B-1)

`src/modules/token/token.service.ts`:
- Promote `generateAccessToken` / `generateTempToken` / `generateProgressToken` to **public** with typed
  payloads (`AccessTokenPayload`, `TemporaryTokenPayload`, `ProgressTokenPayload` in `token.types.ts`).
- Expiries become config-driven with the **same defaults**: access `20d`, temp `20m`, progress `1d`
  (`JWT_ACCESS_EXPIRES_IN`, `JWT_TEMP_EXPIRES_IN`, `JWT_PROGRESS_EXPIRES_IN`).
- `verifyToken` keeps its behavior and messages; drop the pointless local aliases (B-5).

Tests — `token.service.spec.ts`:
- each `generate*` produces a JWT verifiable via `verifyToken` with the right type and expiry
- expired token → `"${type} token has expired"`; tampered → `"${type} invalid token"`;
  unexpected error → `"${type} verification failed"`; empty/non-string → `InvalidToken`
- config-driven expiry honored (env override in the test)

---

## 6. Task 4 — `AuthStateMachine` (`src/modules/auth/domain/auth-state.machine.ts`)

Extract `computeTransporterState` into a pure class with an explicit transition table:

```
PersonalInfoSubmitted ──(vehicle created)──► VehicleInfoSubmitted
VehicleInfoSubmitted  ──(all docs present)──► DocumentsSubmitted
DocumentsSubmitted    ──(verificationStatus=verified)──► Authenticated
```

- `compute(transporter): { userState, transporter }` — drop-in replacement, same outputs as today.
- `AuthService.getUserState` delegates to it (session get/set stays in the service).
- Add `session-utils.ts` with pure session mutation helpers (`setUserState`, `clearAuthData`).

Tests: `auth-state.machine.spec.ts` (matrix over vehicle/docs/verification combos), `session-utils.spec.ts`.

---

## 7. Task 5 — Slim `AuthService` + `TransporterSignupService`

- `auth.service.ts` keeps: `sendOtp`, `checkOtp` (delegating to `OtpService`), `getUserState`,
  plus orchestration of the signup flows — with the multi-step bodies **moved** to
  `application/transporter-signup.service.ts`.
- One `TransactionRunner` per multi-write op; error wrapping handled by the global filter (services throw
  only domain/Nest exceptions — `.catch(formatPrismaError)` removed from auth paths).
- Controller: replace hardcoded cookie objects with `getCookieOptions(config)` (Phase 2, S-2);
  move the `session.userState = VehicleInfoSubmitted` mutation out of the controller into a service
  call (A-4 mitigation).

Tests — re-implement `auth.service.spec.ts`, new `transporter-signup.service.spec.ts`:
- checkOtp new-user → temp token + session priming; existing-user → progress token
- signupSender / signupTransporter happy paths + constraint failures
- signupTransporter + vehicle + documents flows incl. `verificationStatusId` handling
- submitDocuments: transaction rollback on failure; access token issued + cookie behavior recorded
- getUserState matrix (cached Authenticated; transporter states; user not found; sender role)
  using a mocked `AuthStateMachine`

---

## 8. Task 6 — User & vehicle interplay

- `user.service.ts` keeps `getTransporter`, `updateTransporter`, `getProfile` but drops direct
  `S3Service` dependency → injects the `StoragePort` (Phase 5 defines the port; Phase 3 uses a minimal
  interim `S3StoragePort` local interface so tests stay isolated).
- Re-implement `user.service.spec.ts` at 100% (profile URL generation, update stripping phoneNumber,
  transporter CRUD, verification status creation, error mapping via filter).

## 9. Breaking changes (this phase)

| # | Change | Frontend action |
|---|---|---|
| 3.1 | OTP is now **6 digits** (was 5) and zero-padded | Update SMS/template expectations; OTP input UI must accept 6 digits |
| 3.2 | `JWT_*_EXPIRES_IN` envs — default values unchanged (`20d/20m/1d`) | none (only if envs changed) |
| 3.3 | Session `userState` write for vehicle registration now happens inside the service (same end state) | none (behavior parity) |
| 3.4 | Guard files re-exports only — no API change | none |

## 10. Definition of Done (checklist)

- [ ] `OtpService` extracted; `OTP_CACHE` named provider; `MAX_SEND_ATTEMPTS` typo fixed
- [ ] `generateSecureOtp` 6-digit; codes reimplemented with uniqueness enforcement path
- [ ] `TokenService` public API + config-driven expiries; no bracket-notation access anywhere
- [ ] `AuthStateMachine` + `session-utils` pure & tested
- [ ] `AuthService` slim; controller cookie flags centralized; session mutation out of controllers
- [ ] auth/user/token specs re-implemented; module coverage 100/100/100/95 (auth & token paths)
- [ ] `BREAKING-CHANGES.md` updated (3.1 …)
- [ ] `tsc` exit 0, lint 0 errors, `npm test` green

---

## 11. As-built notes

*(Filled when the phase completes — record deviations, actual coverage numbers, timings.)*