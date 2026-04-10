---
phase: 04-corpus-priors-and-soft-pattern-layer
plan: 02
subsystem: engine
tags: [soft-priors, repair-ranking, runtime, vitest, explainability]
requires:
  - phase: 04-corpus-priors-and-soft-pattern-layer
    provides: baseline and genre prior snapshot contracts plus offline export artifacts
provides:
  - Runtime prior snapshot loader for baseline and genre artifacts
  - Layer-aware soft drift scoring with contribution tracking and dynamic thresholds
  - Repair plausibility reranking that preserves hard verdict kinds
affects: [phase-verification, repair UX, future project-specific priors]
tech-stack:
  added: []
  patterns: [layered soft scoring, sparse-layer weakening, advisory repair reranking]
key-files:
  created:
    [
      src/engine/prior-snapshot-loader.ts,
      src/engine/soft-prior-scoring.ts,
      src/engine/repair-plausibility.ts,
      src/services/soft-prior-evaluator.ts,
      tests/engine/soft-prior-scoring.test.ts,
      tests/engine/repair-plausibility.test.ts,
      tests/fixtures/soft-prior-fixtures.ts
    ]
  modified: [src/domain/priors.ts, src/engine/index.ts, src/engine/types.ts, src/services/index.ts, package.json]
key-decisions:
  - "Soft prior outputs stay decomposed by drift type and carry dominant-layer plus contribution evidence."
  - "Sparse genre layers remain available but contribute less and raise thresholds instead of disappearing abruptly."
  - "Repair reranking uses soft prior plausibility only as an advisory overlay on top of the existing deterministic ranking."
patterns-established:
  - "Pattern 1: runtime loaders parse immutable prior artifacts instead of querying analytics state."
  - "Pattern 2: soft-prior assessments summarize strongest layer contributions while preserving per-layer evidence."
requirements-completed: [SOFT-01, DATA-02]
duration: 20min
completed: 2026-04-09
---

# Phase 04: Corpus Priors and Soft Pattern Layer Summary

**Layer-aware soft drift scoring and repair plausibility reranking built on exported baseline and genre prior snapshots**

## Performance

- **Duration:** 20 min
- **Started:** 2026-04-09T12:38:00Z
- **Completed:** 2026-04-09T12:58:00Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments
- Added runtime contracts for drift-type scores, contribution records, and repair plausibility adjustments.
- Implemented snapshot loading, layered soft scoring, and repair reranking while keeping hard verdict kinds untouched.
- Added dedicated soft-prior fixtures and regressions plus a `test:priors` command spanning corpus and runtime paths.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define runtime soft-prior assessment contracts and snapshot loading surface** - `a3e750a` (feat)
2. **Task 2: Implement layered soft scoring and repair plausibility reranking** - `503debe` (feat)
3. **Task 3: Add soft-prior runtime regressions and a dedicated prior test command** - `fb4b926` (test)

## Files Created/Modified
- `src/domain/priors.ts` - Runtime drift score, contribution, and repair plausibility schemas
- `src/engine/prior-snapshot-loader.ts` - Loader for `baseline.prior.json` and `genre-<key>.prior.json`
- `src/engine/soft-prior-scoring.ts` - Layered drift scoring, sparse-layer weakening, and dynamic threshold aggregation
- `src/engine/repair-plausibility.ts` - Advisory repair reranking on top of the deterministic base ranking
- `src/services/soft-prior-evaluator.ts` - Orchestration for loading priors, scoring, reranking, and preserving hard verdict context
- `tests/fixtures/soft-prior-fixtures.ts` - High-signal prior artifacts and repair scenarios
- `tests/engine/soft-prior-scoring.test.ts` - dominant prior layer and dynamic threshold regressions
- `tests/engine/repair-plausibility.test.ts` - reranking and hard verdict preservation regressions
- `package.json` - Added `test:priors` and corrected the `build:priors` execution flag

## Decisions Made

- Used `baseline` vs `genre` specificity weighting so equally confident genre priors can outrank baseline priors without changing hard truth.
- Aggregated final thresholds conservatively from the highest per-drift threshold so sparse evidence cannot masquerade as strong evidence.
- Let `evaluateSoftPriors` pass the incoming hard verdict kind through unchanged, making the hard/soft separation testable at the service boundary.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Switched `build:priors` from `--loader tsx` to `--import tsx`**
- **Found during:** Task 3 (Add soft-prior runtime regressions and a dedicated prior test command)
- **Issue:** The live Node runtime rejected `--loader tsx` because that flag path is deprecated, which would have left the planned prior build command unusable.
- **Fix:** Updated `build:priors` to `node --import tsx scripts/build-priors.ts`.
- **Files modified:** `package.json`
- **Verification:** `npm run typecheck` and `npm run test:priors` passed after the command update, and ad hoc runtime inspection succeeded under `--import tsx`.
- **Committed in:** `fb4b926` (part of task commit)

---

**Total deviations:** 1 auto-fixed (Rule 3: 1)
**Impact on plan:** No scope increase. The deviation kept the planned build path compatible with the actual runtime.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 4 now has both the offline corpus side and the runtime advisory side. Verification can treat Phase 4 as an end-to-end soft-pattern layer: build artifacts exist, runtime loaders consume them, soft drift remains advisory, and repair reranking is explainable.

---
*Phase: 04-corpus-priors-and-soft-pattern-layer*
*Completed: 2026-04-09*
