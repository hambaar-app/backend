# Phase 5 — Supporting Modules & Infrastructure Adapters

> **Status:** ⬜ Not started · **Spec version:** 1.0 (2026-09-02)
>
> **Audit issues in scope:** A-2 (layering / MapService→Prisma), B-4 (console logging), B-8, O-1, remaining `no-unsafe-*`/`require-await` lint warnings on these modules.
> **Depends on:** Phases 2–4 (filters, runner, conventions, ports patterns).

## 1. Objective

Finish the layering: extract the external-world access behind **ports + adapters** (`src/infra/`),
remove the remaining module gods (`user`, `financial`, `map`, `dashboard`, `notification`, support,
vehicle, address), standardize DTO response mapping, and reach **100/100/100/95** on every module.

---

## 2. Task 1 — Infra adapters (`src/infra/`)

### 2.1 `src/infra/ports/` (interfaces, no Nest)
| Port | Methods | Used by |
|---|---|---|
| `StoragePort` | `generatePutPresignedUrl(key, expiresIn)`, `generateGetPresignedUrl(key, expiresIn)`, `deleteFile(key)`, `fileExists(key)` | user, package, trip, s3, dashboard |
| `SmsPort` | `sendSms(mobiles[], message)`, `sendOtp(mobile, code)` | auth |
| `MapsPort` | `calculateDistance(input)`, `reverseGeocode(location)`, `routeDirections(input)` | map, trip, package, turf |
| `CodeGeneratorPort` (optional) | `otp()`, `tripCode()`, `trackingCode()` | auth, trip, package |

### 2.2 Implementations (`src/infra/**/`)
- `storage/s3-storage.adapter.ts` — **move** S3 client logic from `s3.service.ts` (client creation from
  config, presign, delete, exists). `S3Service` becomes a thin `@Injectable` delegating to the adapter
  (keeps existing importers working) **or** is deleted with imports migrated to the port token.
  Decision marker: prefer deleting `s3.service.ts` if the diff stays small (controllers import the token).
- `sms/sms.adapter.ts` — move current `SmsService` HTTP logic; keep exact URLs/headers/payloads;
  add a **retry-once** on 5xx (documented deviation) and keep error messages identical.
- `maps/neshan-maps.adapter.ts` — move direction/reverse-geocode calls from `map.service.ts`.

### 2.3 Provider binding
`PORTS.STORAGE` / `PORTS.SMS` / `PORTS.MAPS` tokens exported from `src/infra/ports/ports.tokens.ts`;
bound in the owning modules (`S3Module`/`SmsModule`/`MapModule`) so unit tests can `overrideProvider`.

Tests — adapter specs with mocked `HttpService`/`S3Client`: success payloads, error propagation,
presign argument shape, header/cookie placement.

---

## 3. Task 2 — `MapService` refactor (A-2 fix)

- `src/modules/map/map.service.ts` becomes an application service using `MapsPort` **only**.
- City lookups (`getIntermediateCitiesWithIds`) move to a new `CityRepository`
  (`src/modules/prisma/repositories/city.repository.ts`) injected into map/package/trip — this removes
  the Prisma dependency from the infra client for good.
- `getIntermediateCitiesWithCoords/WithIds` keep their endpoints; `extractSignificantPoints` and
  `haversineDistance` become exported pure helpers (`map/route-filters.ts`) with **100% tests**
  (roundabout steps, `وارد` instruction, min-distance dedup, empty legs).

Tests: `route-filters.spec.ts`, `city.repository.spec.ts`, `map.service.spec.ts` (HttpService mocked).

---

## 4. Task 3 — Remaining module services

### 4.1 `UserService`
- Switch S3 calls → `StoragePort`; `getProfile` mapping stays (response DTOs via `Serialize`).
- Remove `formatPrismaError` wrappers (global filter). Update `user.service.spec.ts` for the port mock.

### 4.2 `FinancialService`
- Split concerns: `WalletService` (getWallet, addFunds), `EscrowService` (createEscrow/release/refund).
- Decimal-safety: BigInt amounts stay as `bigint` internally; **all** public conversions use a single
  `formatMoney(bigint)` helper (`common/utils/money.ts`, unit tested incl. negative/zero).
- Payment gateway integration stays a documented TODO (no schema/env budget).

### 4.3 `NotificationService`
- Replace `console.*` with Nest `Logger`; add `unreadCount` query; keep `create(content, tx)` signature.
- Specs: create inside/outside tx, unread listing, placeholder substitution via `notification-messages`.

### 4.4 `DashboardService`
- Already reads through `getDateDifference` (date-fns, Phase 1). Remove `formatPrismaError` wrappers;
  inject `StoragePort`; single source for statistics builders; 100% specs for both role branches.

### 4.5 `VehicleService` / `AddressService` / `SupportService`
- Thin services: keep logic, use `TransactionRunner`, remove `formatPrismaError`; response mapping via
  existing `*ResponseDto`s; `SupportService.updateVerification` guards against missing
  `verificationStatusId` with a `NotFoundException` (documented behavior addition).

### 4.6 `S3Controller`
- Add the missing upload **size limit** (audit TODO): `MAX_UPLOAD_SIZE_MB` env + presign-time
  content-length handling or a pre-upload validation endpoint (documented decision marker).

---

## 5. Task 4 — Full-module test sweep

Each touched module gets its `*.service.spec.ts` and `*.controller.spec.ts` re-implemented:
assert **mapping and delegation**, not just "returns the mock". Cover:
- controller 400/404/200 wiring per route, Swagger decorators not asserted
- services: happy path, each throw path, transaction rollback, BigInt formatting
- `@Serialize(ResponseDto)` interceptor path on the response objects (use real `plainToInstance`)

**Coverage gate for the phase:** every module directory listed in this phase at 100/100/100/95.

---

## 6. Breaking changes (this phase)

| # | Change | Frontend action |
|---|---|---|
| 5.1 | `SupportService.updateVerification` throws **404** when transporter has no `verificationStatusId` (was a possible 500) | none normally; handle 404 in admin UI |
| 5.2 | S3 upload size limit enforced (env `MAX_UPLOAD_SIZE_MB`) | Upload UI should pre-check file size |
| 5.3 | `S3Service` → port token refactor is internal (same endpoints) | none |

---

## 7. Definition of Done (checklist)

- [ ] `src/infra/` exists with `StoragePort`/`SmsPort`/`MapsPort` + adapters; no direct AWS/SMS/Neshan
      calls outside adapters
- [ ] `MapService` no longer depends on `PrismaService`; `CityRepository` extracted
- [ ] `User`, `Financial` (wallet/escrow), `Notification`, `Dashboard`, `Vehicle`, `Address`, `Support`
      cleaned (runner, filter, ports, Logger)
- [ ] S3 size limit shipped and tested
- [ ] Every module spec (service + controller) re-implemented; phase modules at 100/100/100/95
- [ ] `tsc` exit 0, lint **0 errors** (warnings backlog significantly reduced — `no-unsafe-*` gone on
      touched files), `npm test` green
- [ ] `BREAKING-CHANGES.md` updated (5.1–5.3)

---

## 8. As-built notes

*(Filled when the phase completes — record deviations, actual coverage numbers, timings.)*