---
phase: 08-interactive-inspection-surface
plan: 02
subsystem: storage
tags: [typescript, zod, postgres, jsonb, vitest, soft-priors, inspection]

# Dependency graph
requires:
  - phase: 07-soft-prior-runtime-integration
    provides: soft-prior advisory runtime result and hard-verdict invariance contract
  - phase: 03-evidence-and-repair-reasoning
    provides: repair candidate schemas and deterministic evidence fields
provides:
  - Run-scoped sanitized inspection snapshot schema
  - JSONB persistence for verdict run inspection snapshots
  - Verdict runner snapshot persistence after soft-prior advisory evaluation
  - Storage and runtime regressions for redaction and hard-verdict invariance
affects: [08-interactive-inspection-surface, inspection-api, inspection-ui, verdict-runner]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Zod-validated persisted JSONB snapshots
    - Advisory whitelist before storage
    - TDD RED/GREEN task commits

key-files:
  created:
    - src/domain/inspection.ts
    - src/storage/migrations/0004_verdict_run_inspection_snapshot.sql
    - src/services/inspection-payload.ts
    - tests/storage/verdict-run-inspection-snapshot.test.ts
  modified:
    - src/domain/index.ts
    - src/storage/repositories/verdict-run-repository.ts
    - src/services/verdict-runner.ts
    - src/services/index.ts
    - tests/engine/verdict-runner.test.ts

key-decisions:
  - "Persist sanitized inspection snapshots on verdict_runs rather than adding a new table."
  - "Keep advisory data separate from hard verdict rows and parse snapshots through Zod on read."

patterns-established:
  - "Snapshot persistence uses RunInspectionSnapshotSchema.parse before write/read."
  - "Verdict runner saves hard verdict rows before evaluating and persisting advisory snapshot data."

requirements-completed: [FLOW-02]

# Metrics
duration: 8min
completed: 2026-04-10
---

# Phase 08 Plan 02: Inspection Snapshot Persistence Summary

**Sanitized verdict-run inspection snapshots with repair candidates and soft-prior advisory data persisted at check time**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-10T09:48:55Z
- **Completed:** 2026-04-10T09:56:57Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Added `RunInspectionSnapshotSchema`, read-side inspection DTO schemas, and the shared verdict-kind order for downstream API/UI work.
- Added `inspection_snapshot JSONB` to `verdict_runs` through the existing canonical migration loader.
- Extended `VerdictRunRepository` with `saveInspectionSnapshot` and `getInspectionSnapshot`, including Zod parsing and run ID mismatch protection.
- Added `createRunInspectionSnapshot` and wired `executeVerdictRun` to persist snapshots after soft-prior evaluation without writing advisory data into verdict rows.
- Verified disabled and available soft-prior snapshot persistence, raw-prior redaction, and hard verdict invariance.

## Task Commits

Each TDD task was committed atomically:

1. **Task 1 RED: Define snapshot schema and repository persistence** - `eb82026` (test)
2. **Task 1 GREEN: Define snapshot schema and repository persistence** - `5fe90c5` (feat)
3. **Task 2 RED: Persist sanitized snapshots from the verdict runner** - `4edefe4` (test)
4. **Task 2 GREEN: Persist sanitized snapshots from the verdict runner** - `384e92f` (feat)

## Files Created/Modified

- `src/domain/inspection.ts` - Inspection snapshot schema, advisory schema, read-side response DTOs, and verdict group order.
- `src/domain/index.ts` - Exports the inspection domain contracts.
- `src/storage/migrations/0004_verdict_run_inspection_snapshot.sql` - Adds `inspection_snapshot JSONB` to `verdict_runs`.
- `src/storage/repositories/verdict-run-repository.ts` - Persists and reloads parsed inspection snapshots.
- `src/services/inspection-payload.ts` - Builds sanitized run inspection snapshots from repairs and soft-prior advisory output.
- `src/services/verdict-runner.ts` - Saves snapshots after hard verdict persistence and soft-prior evaluation.
- `src/services/index.ts` - Exports the inspection snapshot helper.
- `tests/storage/verdict-run-inspection-snapshot.test.ts` - Covers migration, repository save/load, missing snapshots, and redaction.
- `tests/engine/verdict-runner.test.ts` - Covers runner snapshot persistence, redaction, and hard-verdict invariance.

## Decisions Made

- Used a single `inspection_snapshot JSONB` column on `verdict_runs`, matching the plan and avoiding an additional storage table.
- Reused Phase 7 advisory result fields as a whitelist: `assessment`, `rerankedRepairs`, and `repairPlausibilityAdjustments` for available priors; status/reason plus null/empty payload fields for unavailable priors.
- Kept historical inspection fidelity by saving the advisory snapshot at check time rather than requiring future read paths to recompute priors.

## Deviations from Plan

None - plan scope executed as written.

## Issues Encountered

- The first Task 1 typecheck found a task-local fixture typing issue from readonly `as const` arrays. The fixture was typed against `RunInspectionSnapshot["repairCandidates"][number]`, then the storage test and typecheck passed.
- The first Task 2 GREEN run had an over-specific fixture text assertion. It was changed to assert persisted structured advisory score data and non-empty summary text.

## Verification

- `npm run test -- tests/storage/verdict-run-inspection-snapshot.test.ts` - PASS, 4 tests.
- `npm run test -- tests/engine/verdict-runner.test.ts` - PASS, 6 tests.
- `npm run typecheck` - PASS.
- `rg -n "sourceWorkIds|snapshotDir|snapshotSet" src/domain/inspection.ts src/services/inspection-payload.ts src/services/verdict-runner.ts` - PASS, no production matches.

## Known Stubs

None. Stub scan over touched files found no TODO/FIXME/placeholder text or hardcoded empty UI-flow values.

## Threat Flags

None. The new persistence surface is the planned `verdict_runs.inspection_snapshot` trust boundary covered by T-08-05 through T-08-08; no unplanned network endpoint, auth path, file access pattern, or schema trust boundary was introduced.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 08-03 can build the run-scoped inspection payload and API from `RunInspectionResponseSchema`, `getInspectionSnapshot`, and the persisted snapshot data without recomputing historical priors.

---
*Phase: 08-interactive-inspection-surface*
*Completed: 2026-04-10*

## Self-Check: PASSED

- Created files exist: `src/domain/inspection.ts`, `src/storage/migrations/0004_verdict_run_inspection_snapshot.sql`, `src/services/inspection-payload.ts`, `tests/storage/verdict-run-inspection-snapshot.test.ts`, and this summary.
- Task commits exist: `eb82026`, `5fe90c5`, `4edefe4`, `384e92f`.
- Verification commands passed: storage snapshot test, verdict-runner test, typecheck, and production redaction grep.
