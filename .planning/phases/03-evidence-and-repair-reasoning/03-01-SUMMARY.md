---
phase: 03-evidence-and-repair-reasoning
plan: 01
subsystem: engine
tags: [evidence, explanations, verdicts, persistence, vitest]
requires: []
provides:
  - Structured verdict evidence snapshots with event, state, rule, path, and missing-premise summaries
  - Deterministic explanation rendering from persisted evidence fields
  - Explained verdict materialization service and regression coverage for blocked-check visibility
affects: [phase-03-evidence-and-repair-reasoning, phase-04-soft-pattern-priors, phase-05-natural-language-ingestion]
tech-stack:
  added: []
  patterns: [evidence-snapshot-persistence, deterministic-explanation-rendering, explained-verdict-materialization]
key-files:
  created:
    - src/engine/evidence-snapshots.ts
    - src/engine/explanation-renderer.ts
    - src/services/explained-verdicts.ts
    - tests/engine/evidence-traces.test.ts
  modified:
    - src/domain/verdicts.ts
    - src/engine/types.ts
    - src/engine/index.ts
    - src/services/index.ts
    - tests/storage/persistence.test.ts
key-decisions:
  - "Evidence is snapshotted at verdict time instead of being reconstructed only from IDs."
  - "Explanation text is rendered deterministically from structured evidence sections rather than checker-local string building."
  - "State evidence carries the immediate prior boundary and source event so local justification survives reruns."
patterns-established:
  - "Explained verdict construction wraps Phase 2 evaluations without redefining checker semantics."
  - "Blocked downstream checks stay visible in verdict explanations through the same persisted evidence payload."
requirements-completed: [VERD-02]
duration: 21 min
completed: 2026-04-09
---

# Phase 03 Plan 01: Evidence and Repair Reasoning Summary

**Structured verdict evidence snapshots, deterministic explanation rendering, and explained verdict materialization over Phase 2 findings**

## Performance

- **Duration:** 21 min
- **Started:** 2026-04-09T10:14:00Z
- **Completed:** 2026-04-09T10:35:00Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Extended verdict evidence from raw ID lists into event, state, rule, conflict-path, and missing-premise snapshots
- Added deterministic snapshot and explanation helpers that compose persisted evidence into stable verdict text
- Added an explained verdict service plus regressions for impossible travel, betrayal under threat, and blocked checker visibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend verdict schemas for structured evidence snapshots** - `59b0e9b` (feat)
2. **Task 2: Build deterministic evidence snapshot and explanation helpers** - `dff9349` (feat)
3. **Task 3: Integrate explained verdict materialization and evidence regressions** - `8c19783` (test)

**Plan metadata:** pending

## Files Created/Modified
- `src/domain/verdicts.ts` - structured evidence schemas for events, states, rules, conflict paths, and missing premises
- `src/engine/types.ts` - explicit input contracts for evidence snapshotting and deterministic explanations
- `src/engine/evidence-snapshots.ts` - canonical-event and boundary-fact snapshot builder
- `src/engine/explanation-renderer.ts` - deterministic explanation composition from evidence fields
- `src/engine/index.ts` - engine barrel exports for the new snapshot/render helpers
- `src/services/explained-verdicts.ts` - service that converts Phase 2 evaluations into persisted explained verdict records
- `src/services/index.ts` - service barrel export for explained verdict materialization
- `tests/storage/persistence.test.ts` - JSONB round-trip coverage for structured evidence fields
- `tests/engine/evidence-traces.test.ts` - evidence-focused regressions over real engine scenarios

## Decisions Made
- Structured evidence remains the source of truth for explanations; rendered text is a deterministic projection, not persisted prose authority
- State summaries stay local and focused by selecting relevant axes per reason code and recent state changes instead of dumping full character state
- Explained verdict materialization resolves active rules again for the target event so stored rule summaries match the actual evaluated scope

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
Plan 02 can now generate typed repairs from stable evidence snapshots and deterministic explanations rather than raw findings only.
No blockers for `03-02`.

## Self-Check: PASSED

---
*Phase: 03-evidence-and-repair-reasoning*
*Completed: 2026-04-09*
