---
phase: 11-scoped-checks-and-revision-diff
plan: 02
subsystem: api
tags: [revision-diff, inspection, scoped-checks, zod, vitest]
requires:
  - phase: 11-scoped-checks-and-revision-diff
    provides: scope-aware verdict runs with deterministic comparisonScopeKey persistence from Plan 11-01
provides:
  - explicit base run and base revision selectors for deterministic verdict diffing
  - scope-labeled finding-level diff items with lean trace identifiers
  - inspection payload integration for explicit diff selectors without advisory leakage
affects: [verdict-diff, inspection-payload, inspection-api, check-controls-api]
tech-stack:
  added: []
  patterns:
    - prefer baseRunId then baseRevisionId then previousRunId, and fail closed on incompatible comparisonScopeKey values
    - reuse verdict evidence ids for diff traces instead of embedding inspection snapshots or advisory internals
key-files:
  created: []
  modified:
    - src/domain/inspection.ts
    - src/services/verdict-diff.ts
    - src/services/inspection-payload.ts
    - src/storage/repositories/verdict-run-repository.ts
    - tests/engine/verdict-diff.test.ts
    - tests/services/inspection-payload.test.ts
key-decisions:
  - "Explicit diff selection now resolves in strict priority order: baseRunId, then deterministic baseRevisionId lookup, then previousRunId fallback."
  - "Cross-revision lookup only matches runs with the same persisted comparisonScopeKey and never falls back heuristically across scopes."
  - "Inspection diff items expose canonical ids plus scope labels, while advisory reranking and repair data stay outside the diff item payload."
patterns-established:
  - "Diff services return backward-compatible summary arrays and richer findingChanges entries from the same deterministic verdict records."
  - "Inspection payload normalization remains additive: existing diff consumers still receive previousRunId while new clients can read current/base scope metadata and findingChanges."
requirements-completed: [DRAFT-02, DIFF-01, TRACE-01]
duration: 5 min
completed: 2026-04-11
---

# Phase 11 Plan 02: Scoped Revision Diff Summary

**Deterministic scoped verdict diffs now support explicit base run or base revision selection and expose lean finding-level scope labels for inspection consumers**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-11T07:26:54Z
- **Completed:** 2026-04-11T07:32:07Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Added Wave 2 regressions for explicit `baseRunId`/`baseRevisionId` selection and lean finding-level diff labels in inspection payloads.
- Generalized verdict diffing into `diffVerdictRuns()` with deterministic comparable-run lookup, scope metadata, and finding-level change items while preserving the existing summary arrays.
- Extended inspection diff schemas and payload assembly so scoped runs now surface `findingChanges`, current/base scope ids, and comparison keys without leaking repair candidates or advisory internals.

## Task Commits

Each task was committed atomically:

1. **Task 11-02-01: Add explicit base-selector and incompatible-scope diff regressions** - `a58b357` (test)
2. **Task 11-02-02: Generalize diff selection and comparable-run lookup** - `c3f028c` (feat)
3. **Task 11-02-03: Serialize lean finding-level diff items through the inspection payload** - `25b1b03` (feat)

## Files Created/Modified
- `tests/engine/verdict-diff.test.ts` - Pins explicit base run precedence, base revision lookup, and incompatible-scope rejection.
- `tests/services/inspection-payload.test.ts` - Proves inspection payload diff items include scope labels and lean trace fields only.
- `src/services/verdict-diff.ts` - Adds `diffVerdictRuns()`, strict base selection order, comparable-run resolution, and finding-level diff items.
- `src/storage/repositories/verdict-run-repository.ts` - Restricts comparable-run lookup to the requested revision plus matching `comparison_scope_key`.
- `src/domain/inspection.ts` - Extends inspection diff DTOs with scope metadata and `findingChanges`.
- `src/services/inspection-payload.ts` - Threads explicit base selectors into diff generation and normalizes the richer diff payload.

## Decisions Made
- Kept `diffAgainstPreviousRun()` as a thin compatibility wrapper over `diffVerdictRuns()` so existing call sites stay stable.
- Modeled resolved diff items from the selected base run and added/persisted/changed-supporting items from the current run so each entry carries the correct scope label.
- Preserved `previousRunId` in the inspection diff DTO as the selected base run id for additive compatibility, while adding explicit current/base scope metadata alongside it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Carried additive inspection DTO plumbing forward before closing Task 11-02-02 verification**
- **Found during:** Task 11-02-02
- **Issue:** Repository-wide `npm run typecheck` includes the new inspection payload regression, so the explicit selector input and `findingChanges` DTO fields had to exist before the Task 11-02-02 verification gate could pass.
- **Fix:** Completed the diff service/repository work first, then added the additive inspection schema and payload plumbing required by the shared typecheck gate while keeping the task commits separated by responsibility.
- **Files modified:** `src/domain/inspection.ts`, `src/services/inspection-payload.ts`
- **Verification:** `npm exec -- vitest run tests/engine/verdict-diff.test.ts tests/services/inspection-payload.test.ts --bail=1 && npm run typecheck`
- **Committed in:** `25b1b03`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No scope change. The additive DTO plumbing was required to satisfy the repository-wide typecheck contract after the new TDD regressions landed.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Inspection API work can now pass explicit base selectors through to the service layer without inventing new diff semantics.
- Scoped check and inspection surfaces already preserve hard/soft separation, so the next wave can stay focused on API request wiring and response coverage.

## Self-Check: PASSED

- Verified `.planning/phases/11-scoped-checks-and-revision-diff/11-02-SUMMARY.md` exists.
- Verified task commits `a58b357`, `c3f028c`, and `25b1b03` exist in `git log --oneline --all`.

---
*Phase: 11-scoped-checks-and-revision-diff*
*Completed: 2026-04-11*
