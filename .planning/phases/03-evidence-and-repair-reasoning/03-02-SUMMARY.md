---
phase: 03-evidence-and-repair-reasoning
plan: 02
subsystem: engine
tags: [repairs, ranking, deduplication, evidence, vitest]
requires: ["03-01"]
provides:
  - Typed repair contracts with confidence bands and bounded bundle semantics
  - Reason-scoped repair catalog and deterministic local repair generation
  - Ranked and deduplicated repair candidates with top-three display limits
affects: [phase-03-evidence-and-repair-reasoning, phase-04-soft-pattern-priors, phase-05-natural-language-ingestion]
tech-stack:
  added: []
  patterns: [reason-scoped-repair-families, local-repair-search, fingerprint-dedup]
key-files:
  created:
    - src/domain/repairs.ts
    - src/engine/repair-catalog.ts
    - src/engine/repair-ranking.ts
    - src/engine/repair-generator.ts
    - tests/engine/repair-generator.test.ts
  modified:
    - src/domain/index.ts
    - src/engine/index.ts
key-decisions:
  - "Repair families are constrained by reason code or category fallback instead of generic suggestion generation."
  - "Displayed repairs are capped to three and confidence is exposed as bands, not raw scores."
  - "Duplicate repairs merge by normalized payload fingerprint while retaining all sourceFindingIds."
patterns-established:
  - "Repair generation consumes explained evidence snapshots rather than raw checker internals."
  - "Bundle repairs stay exceptional and taxonomy-gated instead of becoming the default output shape."
requirements-completed: [REPR-01, REPR-02]
duration: 5 min
completed: 2026-04-09
---

# Phase 03 Plan 02: Evidence and Repair Reasoning Summary

**Reason-scoped typed repairs, deterministic ranking, and provenance-preserving deduplication over local failing paths**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-09T10:35:00Z
- **Completed:** 2026-04-09T10:39:56Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Added typed repair contracts for assumptions, prior events, rule declarations, and tightly limited bundles
- Implemented a reason-to-family catalog plus generator logic that searches only the failing path neighborhood
- Added regression coverage for missing causal link, impossible travel, top-three capping, duplicate-source merging, and blocked finding exclusion

## Task Commits

Each task was committed atomically:

1. **Task 1: Define typed repair contracts and reason-to-family rules** - `05063d5` (feat)
2. **Task 2: Implement local repair generation, ranking, and deduplication** - `cc2988e` (feat)
3. **Task 3: Add repair-generation regressions over canonical fixtures** - `5815433` (test)

**Plan metadata:** pending

## Files Created/Modified
- `src/domain/repairs.ts` - typed repair schemas and payload contracts
- `src/domain/index.ts` - domain barrel export for repair contracts
- `src/engine/repair-catalog.ts` - reason/category to repair-family policy map
- `src/engine/repair-ranking.ts` - minimal-change, story/world-fit, locality ranking and confidence bands
- `src/engine/repair-generator.ts` - local repair candidate generation, deduplication, and top-three clipping
- `src/engine/index.ts` - exported repair-generation surface
- `tests/engine/repair-generator.test.ts` - deterministic repair regressions

## Decisions Made
- Reason codes remain the primary selector for repair families, with category fallback only where the taxonomy explicitly needs it
- Confidence stays ordinal and detached from validity so a strong repair does not masquerade as a valid verdict
- Repair bundles exist only as a gated extension for reasons that naturally need two-step fixes, such as movement-rule exceptions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None after fixing payload narrowing for bundle and ranking type guards during implementation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
Plan 03 can now attach stable finding IDs and verdict-run diffs to already explained and repairable verdict records.
No blockers for `03-03`.

## Self-Check: PASSED

---
*Phase: 03-evidence-and-repair-reasoning*
*Completed: 2026-04-09*
