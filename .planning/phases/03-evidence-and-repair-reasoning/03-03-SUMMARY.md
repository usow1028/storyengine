---
phase: 03-evidence-and-repair-reasoning
plan: 03
subsystem: database
tags: [verdict-runs, diff, persistence, reasoning, vitest]
requires: ["03-01", "03-02"]
provides:
  - Run-aware verdict persistence with stable representative finding IDs
  - Verdict-run execution service that stores a new run per evaluation
  - Immediate-previous-run diffing for representative verdicts and supporting findings
affects: [phase-03-evidence-and-repair-reasoning, phase-04-soft-pattern-priors, phase-05-natural-language-ingestion]
tech-stack:
  added: []
  patterns: [run-oriented-verdict-history, stable-finding-fingerprints, previous-run-only-diff]
key-files:
  created:
    - src/storage/migrations/0002_verdict_runs.sql
    - src/storage/repositories/verdict-run-repository.ts
    - src/services/verdict-runner.ts
    - src/services/verdict-diff.ts
    - tests/engine/verdict-runner.test.ts
    - tests/engine/verdict-diff.test.ts
  modified:
    - src/domain/verdicts.ts
    - src/storage/schema.ts
    - src/storage/index.ts
    - src/storage/repositories/verdict-repository.ts
    - src/services/explained-verdicts.ts
    - src/services/index.ts
    - package.json
    - tests/storage/persistence.test.ts
key-decisions:
  - "Every persisted verdict run references only the immediately previous run, so diff semantics stay deterministic and local."
  - "Stable finding IDs are derived from checker, reason code, category, and evidence fields instead of explanation text."
  - "Run-linked verdict rows are additive; revision history is no longer overwrite-only."
patterns-established:
  - "Reasoning history now flows through verdict_runs plus run-linked verdict rows instead of revision-only snapshots."
  - "Supporting-finding drift is detected by fingerprinting nested findings while representative continuity depends on top-level findingId."
requirements-completed: [VERD-03]
duration: 6 min
completed: 2026-04-09
---

# Phase 03 Plan 03: Evidence and Repair Reasoning Summary

**Run-aware verdict persistence, stable finding fingerprints, and immediate-previous-run diffing for reasoning history**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-09T10:40:00Z
- **Completed:** 2026-04-09T10:46:22Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments
- Added `verdict_runs` persistence and linked verdict rows to concrete evaluation executions
- Implemented a verdict runner that stores new runs and assigns deterministic representative `findingId` values
- Implemented previous-run-only diffing and reasoning regressions, then wired a dedicated `test:reasoning` command

## Task Commits

Each task was committed atomically:

1. **Task 1: Add verdict-run persistence and stable finding identity contracts** - `8c2c452` (feat)
2. **Task 2: Implement verdict-run execution and previous-run diff services** - `d25a5f8` (feat)
3. **Task 3: Add rerun/diff regressions and a stable reasoning test command** - `ec72b12` (test)

**Plan metadata:** pending

## Files Created/Modified
- `src/domain/verdicts.ts` - run and stable finding identity fields in persisted verdict contracts
- `src/storage/migrations/0002_verdict_runs.sql` - verdict run table and verdict-to-run linkage
- `src/storage/schema.ts` - lexical migration loading across core and verdict-run migrations
- `src/storage/index.ts` - storage barrel export for the verdict run repository
- `src/storage/repositories/verdict-run-repository.ts` - run-level CRUD helpers
- `src/storage/repositories/verdict-repository.ts` - run-linked verdict persistence and run-scoped queries
- `src/services/explained-verdicts.ts` - run-aware explained verdict materialization
- `src/services/verdict-runner.ts` - end-to-end verdict execution and persistence orchestration
- `src/services/verdict-diff.ts` - immediately previous run diff service
- `src/services/index.ts` - reasoning service exports
- `package.json` - stable `test:reasoning` command
- `tests/storage/persistence.test.ts` - run persistence and `findingId` round-trip coverage
- `tests/engine/verdict-runner.test.ts` - distinct verdict run regression
- `tests/engine/verdict-diff.test.ts` - immediate previous run diff regression

## Decisions Made
- Run history stays append-only at the repository level; even same-revision evaluations produce new run IDs
- Representative finding IDs are stored in verdict evidence so later diff consumers do not need to reconstruct them from explanation text
- Diff output reports representative change status separately from added, resolved, persisted, and supporting-finding drift

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
Phase 03 now has evidence snapshots, repairs, and rerun history as a coherent reasoning surface.
Ready for phase-level verification and security/validation follow-up.

## Self-Check: PASSED

---
*Phase: 03-evidence-and-repair-reasoning*
*Completed: 2026-04-09*
