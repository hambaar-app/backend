# Conventions — Target Architecture & Coding Rules

> Applies to all refactoring phases. New code must follow this document; touched code is migrated to it.

## 1. Folder & Naming

| Kind | Convention | Example |
|---|---|---|
| Folders | `kebab-case` | `trip-request.service.ts` location: `modules/trip/domain/` |
| Classes | `PascalCase`, suffixed by role | `TripRequestService`, `S3StorageAdapter` |
| DTOs | `*Dto` in `dto/` of the owning module | `CreateTripDto` |
| Interfaces/tokens | `*Port` for infra interfaces, injection token `'PORTS.SMS'` | `SmsPort` |
| Test files | `<unit>.spec.ts` co-located with source | `token.service.spec.ts` |
| Fixtures | `test/fixtures/*.fixture.ts` (shared, pure factories) | `user.fixture.ts` |
| Enums | single-purpose enum files under `common/enums/` | `cookies.enum.ts` |

**Module layout (business modules with real logic):**
```
<module>/
├── <module>.module.ts
├── <module>.controller.ts      # thin HTTP only
├── application/                # orchestration services
├── domain/                     # business rules / state machines
├── dto/
└── types/
```

## 2. Layering Rules

1. **Controllers** — no injected `PrismaService`, no business rules, no S3/SMS/HTTP calls. Read params/DTO → call one application service → return mapped DTO.
2. **Application services** — own use-cases; may open transactions through `TransactionRunner`; compose domain services; never import Prisma types into their public signatures (use domain types).
3. **Domain services** — pure logic (state machines, pricing, scoring). They receive plain inputs; no `ConfigService` where a value can be constructor-injected as a plain option.
4. **Infra adapters (`src/infra/**`)** — the only place touching S3, SMS HTTP APIs, Neshan, raw Redis clients. Each implements an interface (`*Port`) and is bound via an injection token, so unit tests replace it with a fake.
5. **No cross-module imports of internals** — modules expose what others need via their module exports (services/tokens), never deep-import `application/domain` files of another module.
6. **Prisma client access** — only through `PrismaService` or `TransactionRunner`; `PrismaTransaction` type alias is the single transaction handle type.

## 3. Error Handling

- A single global `AllExceptionsFilter` maps exceptions to the standard error envelope; an internal
  `PrismaErrorMapper` converts Prisma errors — services stop wrapping every call in `.catch(formatPrismaError)`.
- `formatPrismaError` is retired in favor of the filter; the mapping table (P2002 → 409, P2025 → 404, …) is preserved and unit-tested via the filter.
- Services throw typed Nest exceptions or domain exceptions; no `console.error` for control flow.
- Error response envelope (single shape for all errors):

```json
{
  "statusCode": 409,
  "message": "A Vehicle with the plate already exists.",
  "error": "Conflict"
}
```

## 4. Validation & Serialization

- All request bodies/params/queries validated by DTOs (`class-validator`) through the global `ValidationPipe` with `whitelist`, `transform`, `forbidNonWhitelisted`.
- Responses exposed through `@Serialize(Dto)` with `@Expose()`-annotated DTOs — never raw entities.
- Config: every env var declared in a validated schema (`src/common/config/env.validation.ts`); access via typed `ConfigService` getters or injected option objects — **no stringly-typed keys scattered in services**.

## 5. Testing Conventions

- One spec per production file; arrange-act-assert; `describe` per method.
- Mocking: `jest-mock-extended` for class dependencies; hand-written fakes for infra ports.
- Fixtures from `test/fixtures/` — no inline 20-line mock literals.
- No test requires env vars, DB, Redis, or network. Time-dependent tests use `jest.useFakeTimers()` / injected clock.
- Naming: `it('should <behavior> when <condition>')`.

## 6. TypeScript & Lint

- `strict: true` (tsconfig), `noUncheckedIndexedAccess` aspirational for new files.
- ESLint flat config with `typescript-eslint` recommended-type-checked; rules enabled in Phase 1:
  `@typescript-eslint/no-explicit-any` (warn→error per phase), `no-floating-promises`, `no-misused-promises`, `no-unsafe-argument`, `no-unused-vars` (error), `eqeqeq`.
- Prettier: existing `.prettierrc` (singleQuote, trailingComma all) + `printWidth: 100`.
- No bracket-notation access to private members; no `as any` without a comment and a `// eslint-disable` line.

## 7. Git & CI

- Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`) — one phase ≈ one PR series.
- CI stages: lint → unit tests (no secrets) → coverage gate → build (on master). Integration stage added in Phase 6.
- `prisma/.env` removed from the repo; `.env.development` remains as the documented template.
