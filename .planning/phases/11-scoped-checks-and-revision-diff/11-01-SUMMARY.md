---
phase: 11-scoped-checks-and-revision-diff
plan: 01
subsystem: database
tags: [scoped-checks, verdict-runs, ingestion, vitest, zod]
requires:
  - phase: 09-draft-container-and-segment-scope-model
    provides: persisted draft scope ids, ordered sections, and scope payload contracts
  - phase: 10-incremental-extraction-and-review-resilience
    provides: approval reset semantics and approved/current segment guards
provides:
  - scope-aware verdict run persistence with deterministic comparison identity
  - scope-local ingestion check validation over approved/current segments only
  - full-graph deterministic evaluation with persisted verdict retention limited to in-scope events
affects: [verdict-diff, inspection-payload, check-controls-api, inspection-api]
tech-stack:
  added: []
  patterns:
    - persist raw scope metadata plus deterministic comparisonScopeKey on verdict runs
    - keep full-graph evaluation intact and retain only verdicts anchored to scope.eventIds
key-files:
  created:
    - src/storage/migrations/0007_scoped_verdict_runs.sql
    - tests/services/scoped-ingestion-check.test.ts
  modified:
    - src/domain/verdicts.ts
    - src/services/ingestion-check.ts
    - src/services/verdict-runner.ts
    - src/storage/repositories/verdict-run-repository.ts
    - tests/storage/verdict-run-inspection-snapshot.test.ts
key-decisions:
  - "Scoped execution resolves only persisted scopeId values from the session snapshot and fails closed when any in-scope segment is not approved/current."
  - "Verdict runs keep previousRunId lineage unchanged while adding comparisonScopeKey for later same-scope diff selection."
  - "Scoped checks still evaluate the full revision graph, then persist and inspect only verdicts whose anchor event belongs to the resolved scope."
patterns-established:
  - "Comparison identity is stored as raw scope metadata plus a deterministic key, not inferred later from fuzzy source overlap."
  - "Scope-local checks narrow persistence, repairs, and advisory generation without changing the deterministic engine path."
requirements-completed: [CHECK-01, DRAFT-02, TRACE-01]
duration: 8 min
completed: 2026-04-11
---

# Phase 11 Plan 01: Scoped Check Foundation Summary

**Approved scope resolution now persists deterministic comparison identity and stores only scope-anchored verdicts from full-graph checks**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-11T07:08:00Z
- **Completed:** 2026-04-11T07:17:03Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Added Wave 0 regressions for scope-local approval gating and scope-aware verdict run storage.
- Extended `verdict_runs` persistence with `scope_id`, `scope_kind`, `comparison_scope_key`, and `scope_payload` so later diff waves can resolve comparable runs deterministically.
- Implemented persisted `scopeId` resolution in `executeIngestionCheck()` and retained only in-scope verdicts, repairs, and advisory output in `executeVerdictRun()` while preserving full-graph evaluation.

## Task Commits

Each task was committed atomically:

1. **Task 11-01-01: Create Wave 0 scoped-check service and storage regressions** - `112c9eb` (test)
2. **Task 11-01-02: Persist scope-aware verdict run metadata and comparable-run identity** - `9c78970` (feat)
3. **Task 11-01-03: Implement scope resolution and scope-anchored verdict retention** - `86e6c92` (feat)

## Files Created/Modified
- `src/storage/migrations/0007_scoped_verdict_runs.sql` - Adds scope-aware verdict run columns and lookup index.
- `src/domain/verdicts.ts` - Defines `VerdictRunScopeSchema` and attaches optional scope metadata to run records.
- `src/storage/repositories/verdict-run-repository.ts` - Persists, reloads, and queries scope-aware verdict run metadata.
- `src/services/ingestion-check.ts` - Resolves persisted scope ids, validates approved/current scope segments, and derives ordered segment/event membership.
- `src/services/verdict-runner.ts` - Preserves full-graph evaluation while retaining only verdicts anchored to in-scope events.
- `tests/services/scoped-ingestion-check.test.ts` - Proves approved scope execution and fail-closed stale/unapproved scope behavior.
- `tests/storage/verdict-run-inspection-snapshot.test.ts` - Proves scope metadata round-trips through storage.

## Decisions Made
- Used persisted `scopeId` lookup from `snapshot.checkScopes` instead of accepting inline scope objects or inferred scope shapes.
- Derived deterministic comparison keys from stable document/section/range identity so later revision diff logic can avoid heuristic fallback.
- Filtered persisted verdicts after full evaluation by anchor event membership, which preserves deterministic reasoning context and still enforces scope-local storage.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Corrected scoped test fixtures to match persisted draft segment and stale-segment semantics**
- **Found during:** Task 11-01-01 and Task 11-01-03
- **Issue:** The initial Wave 0 fixture omitted required draft-path/default segment fields, and direct `stale: true` setup was overwritten because `saveExtractionBatch()` recomputes staleness from extraction attempts.
- **Fix:** Completed the persisted draft segment fixture shape and modeled stale scope membership through an `invalidatedApproval` extraction attempt so the regression follows real repository behavior.
- **Files modified:** `tests/services/scoped-ingestion-check.test.ts`
- **Verification:** `npm exec -- vitest run tests/services/scoped-ingestion-check.test.ts tests/storage/verdict-run-inspection-snapshot.test.ts --bail=1 && npm run typecheck`
- **Committed in:** `86e6c92`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No scope change. The auto-fix was required so Wave 0 exercised the real persisted session semantics instead of a synthetic stale flag.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 11-02 can now use `comparisonScopeKey` and stored scope payload to resolve deterministic comparable-run baselines.
- API-layer work can add `scopeId` request semantics on top of the now-verified scoped service path without changing the deterministic verdict engine.

## Self-Check: PASSED

- Verified `.planning/phases/11-scoped-checks-and-revision-diff/11-01-SUMMARY.md` exists.
- Verified task commits `112c9eb`, `9c78970`, and `86e6c92` exist in `git log --oneline --all`.

---
*Phase: 11-scoped-checks-and-revision-diff*
*Completed: 2026-04-11*
