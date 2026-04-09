---
phase: 02-hard-constraint-engine
plan: 02
subsystem: engine
tags: [hard-constraints, rule-activation, verdict-aggregation, orchestration, vitest]
requires: ["02-01"]
provides:
  - Deterministic active-rule resolution across global, story, location, character, and event scopes
  - Executable hard-engine orchestration for event paths and revision-wide evaluation
  - Representative verdict aggregation with supporting findings and skipped-check metadata
  - Repository support for revision-level rule loading and bulk verdict persistence
affects: [phase-02-hard-constraint-engine, phase-03-evidence-and-repair-reasoning, phase-05-natural-language-ingestion]
tech-stack:
  added: []
  patterns: [scope-precedence-resolution, short-circuit-checking, representative-verdict-selection]
key-files:
  created:
    - src/engine/rule-activation.ts
    - src/engine/verdict-aggregator.ts
    - src/engine/hard-constraint-engine.ts
    - tests/engine/rule-activation.test.ts
    - tests/engine/hard-constraint-engine.test.ts
  modified:
    - src/engine/index.ts
    - src/services/index.ts
    - src/storage/repositories/rule-repository.ts
    - src/storage/repositories/verdict-repository.ts
key-decisions:
  - "Local location, character, and event rules do not become active from target match alone when metadata.active is false."
  - "Representative verdict ties are broken by checker execution order, not lexical checker name."
  - "Service exports expose the engine surface selectively to avoid type collisions with boundary-query contracts."
patterns-established:
  - "The hard engine resolves effective rules before checker execution and carries the winning snapshots through the full path evaluation."
  - "Upstream hard contradictions convert downstream families into explicit notEvaluated entries instead of silently dropping them."
requirements-completed: [RULE-01, RULE-02, RULE-03, RULE-04, VERD-01]
duration: 7 min
completed: 2026-04-09
---

# Phase 02 Plan 02: Hard Constraint Engine Summary

**Deterministic rule activation, representative verdict aggregation, and end-to-end hard-engine orchestration**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-09T08:27:00Z
- **Completed:** 2026-04-09T08:34:00Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- Added revision-level rule listing and bulk verdict persistence so the engine can evaluate and store whole paths or revisions
- Implemented deterministic rule activation with fixed scope precedence and same-scope priority ordering
- Built the hard engine entry points that run checker families in locked order and emit representative verdicts plus skipped-check metadata
- Proved short-circuiting, override behavior, and severity ordering with orchestration-focused regression tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement rule activation and precedence resolution** - `45246d7` (feat)
2. **Task 2: Build the hard engine orchestration and verdict aggregation flow** - `729d7fb` (feat)
3. **Task 3: Prove deterministic orchestration and representative verdict selection** - `2c31b8c` (test)

**Plan metadata:** pending

## Files Created/Modified
- `src/storage/repositories/rule-repository.ts` - revision-level rule listing for engine activation
- `src/engine/rule-activation.ts` - effective-rule resolution and downstream checker blocking list
- `src/storage/repositories/verdict-repository.ts` - bulk verdict save and revision replacement helpers
- `src/engine/verdict-aggregator.ts` - representative verdict aggregation with execution-order tie-breaks
- `src/engine/hard-constraint-engine.ts` - event-path and revision-wide hard engine entry points
- `src/engine/index.ts` - exported orchestration surface
- `src/services/index.ts` - selective engine re-exports without boundary-type collisions
- `tests/engine/rule-activation.test.ts` - precedence and explicit activation coverage
- `tests/engine/hard-constraint-engine.test.ts` - short-circuit, override, and severity regression coverage

## Decisions Made
- Fixed scope precedence remains the source of truth; same-scope priority only breaks ties inside the same scope
- The engine stops after upstream hard contradictions from time, space, or physics and records skipped checker families explicitly
- Revision-level orchestration stays TypeScript-first; solver integration is still deferred to later phases

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Local inactive rules were activating from target match alone**
- **Found during:** Task 1 (Implement rule activation and precedence resolution)
- **Issue:** Event-scoped overrides with `active=false` were winning over story defaults even without an explicit activation change
- **Fix:** Required `metadata.active` for location, character, and event scope target matches unless the event carries an explicit activate/override/declare rule change
- **Files modified:** `src/engine/rule-activation.ts`
- **Verification:** `npm run typecheck` and `npx vitest run tests/engine/rule-activation.test.ts tests/engine/hard-constraint-engine.test.ts` passed after the fix

**2. [Rule 3 - Blocking] Representative verdict ties were breaking by checker name instead of execution order**
- **Found during:** Task 3 (Prove deterministic orchestration and representative verdict selection)
- **Issue:** Impossible-travel paths surfaced `space` as the representative checker because lexical sort beat execution order
- **Fix:** Added fixed checker-order precedence so equal-severity findings prefer `time > space > physics > causality > character`
- **Files modified:** `src/engine/verdict-aggregator.ts`
- **Verification:** `npx vitest run tests/engine/rule-activation.test.ts tests/engine/hard-constraint-engine.test.ts` passed after the fix

**3. [Rule 3 - Blocking] Service barrel export collided with boundary-query types**
- **Found during:** Task 2 (Build the hard engine orchestration and verdict aggregation flow)
- **Issue:** Re-exporting the entire engine surface from `src/services/index.ts` collided with the existing `CharacterBoundaryFacts` export
- **Fix:** Replaced the wildcard export with explicit engine entry points only
- **Files modified:** `src/services/index.ts`
- **Verification:** `npm run typecheck` passed after the fix

---

**Total deviations:** 3 auto-fixed (3 blocking)
**Impact on plan:** No scope change. The fixes tightened the deterministic semantics that Phase 2 was meant to lock in.

## Issues Encountered
None after the three blocking fixes were applied.

## User Setup Required

None.

## Next Phase Readiness
Plan 03 can now build reusable fixtures and regression suites on top of a deterministic engine entry point.
No blockers for `02-03`.

## Self-Check: PASSED

---
*Phase: 02-hard-constraint-engine*
*Completed: 2026-04-09*
