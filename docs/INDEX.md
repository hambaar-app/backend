# Hambaar Backend — Documentation Index

> Complete documentation set for the **"Professional Refactor"** (started 2026-09-02).
> All files live in `docs/` and are updated as phases progress.

## How to read this set

`REFACTORING-PLAN.md` is the **master plan** (goals, phases, decisions, risks).
`CODEBASE-AUDIT.md` is the **evidence** (every issue, with severity and file refs).
`CONVENTIONS.md` is the **law** (target architecture, coding rules) for all new code.
`TESTING-STRATEGY.md` is the **coverage & test policy** used to grade every phase.
`BREAKING-CHANGES.md` is the **frontend coordination log** (every API-visible change).
One `phase-N-*.md` file per phase — the **implementation spec + as-built record**.

## Document map

| Doc | What it answers | Status |
|---|---|---|
| [REFACTORING-PLAN.md](./REFACTORING-PLAN.md) | What are we doing, in what order, and why | ✅ |
| [CODEBASE-AUDIT.md](./CODEBASE-AUDIT.md) | What is wrong right now (evidence) | ✅ |
| [CONVENTIONS.md](./CONVENTIONS.md) | How should the target code look | ✅ |
| [TESTING-STRATEGY.md](./TESTING-STRATEGY.md) | How do we prove quality (coverage policy) | ✅ |
| [BREAKING-CHANGES.md](./BREAKING-CHANGES.md) | What will the frontend need to change | ✅ |
| [phase-1-foundation.md](./phase-1-foundation.md) | Phase 1 spec + as-built | ✅ Completed |
| [phase-2-security-config.md](./phase-2-security-config.md) | Phase 2 spec (bootstrap/config/security) | ✅ Spec complete |
| [phase-3-auth-session.md](./phase-3-auth-session.md) | Phase 3 spec (auth/session/user) | ✅ Spec complete |
| [phase-4-core-business.md](./phase-4-core-business.md) | Phase 4 spec (package/trip/matching/pricing) | ✅ Spec complete |
| [phase-5-supporting-modules.md](./phase-5-supporting-modules.md) | Phase 5 spec (modules + infra adapters) | ✅ Spec complete |
| [phase-6-integration-ci.md](./phase-6-integration-ci.md) | Phase 6 spec (integration, CI, final gates) | ✅ Spec complete |

## Quick stats

| Metric | Value |
|---|---|
| Total audit issues | ~60 (🔴 12 · 🟠 20 · 🟡 20 · 🔵 8) |
| Phases | 6 |
| Docs in set | 12 |
| Coverage baseline (scoped) | 68 / 60 / 42 / 67 (Stmts/Branches/Funcs/Lines) |
| Coverage target | 100 / 95 / 100 / 100 |
| Suite runtime | 514 s → ~20 s |

## Phase dependency graph

```
Phase 1 (foundation/tooling) ──► Phase 2 (bootstrap/config/security)
                                        │
                                        ▼
                                   Phase 3 (auth/session/user)
                                        │
                                        ▼
                                   Phase 4 (package/trip/pricing/matching)
                                        │
                                        ▼
                                   Phase 5 (supporting modules + infra adapters)
                                        │
                                        ▼
                                   Phase 6 (integration tests, CI gates, final docs)
```

Rationale: infrastructure first (everything depends on bootstrap/config), then auth (everything depends on auth), then the two god services, then the long tail, then locking it all in with integration + CI.

## Changelog

| Date | Change |
|---|---|
| 2026-09-02 | Full doc set created (audit, plan, conventions, testing, breaking-changes, index, all 6 phase docs). Phase 1 as-built filled. Baseline metrics back-filled from scoped coverage run. |

## Updating policy
- Any change to conventions/architecture goes through `REFACTORING-PLAN.md` and `CONVENTIONS.md`.
- Any API-visible change must add a `BREAKING-CHANGES.md` entry **before** it lands.