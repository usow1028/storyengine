---
phase: 02-hard-constraint-engine
plan: 01
subsystem: engine
tags: [hard-constraints, rule-contracts, verdict-evidence, checker-families, vitest]
requires: []
provides:
  - Execution-ready rule metadata with concrete scope targets
  - Structured verdict evidence for representative checker, reason code, supporting findings, and skipped checks
  - Family-separated checker modules for time, space, physics, causality, and character-state analysis
  - Family-level regression coverage for direct contradiction vs repairable-gap behavior
affects: [phase-02-hard-constraint-engine, phase-03-evidence-and-repair-reasoning, phase-06-interactive-inspection-surface]
tech-stack:
  added: []
  patterns: [scope-targeted-rule-activation, reason-coded-findings, family-separated-checkers]
key-files:
  created:
    - src/engine/types.ts
    - src/engine/reason-codes.ts
    - src/engine/checkers/time-checker.ts
    - src/engine/checkers/space-checker.ts
    - src/engine/checkers/physics-checker.ts
    - src/engine/checkers/causality-checker.ts
    - src/engine/checkers/character-checker.ts
    - src/engine/index.ts
    - tests/engine/checker-families.test.ts
  modified:
    - src/domain/rules.ts
    - src/domain/verdicts.ts
    - src/storage/migrations/0001_canonical_core.sql
    - src/storage/repositories/rule-repository.ts
    - tests/storage/persistence.test.ts
key-decisions:
  - "Rule packs now carry optional scopeTargetId so local precedence can bind to real canonical objects."
  - "Verdict evidence remains in jsonb but now stores representative checker, reason code, supporting findings, and notEvaluated metadata."
  - "Phase 2 starts with TypeScript checker families rather than a solver-first execution path."
patterns-established:
  - "Each checker family returns reason-coded findings using a shared evidence shape."
  - "Direct contradictions stay separate from repairable gaps at checker level, not only in later aggregation."
requirements-completed: [RULE-01, RULE-02, RULE-03, RULE-04, VERD-01]
duration: 13 min
completed: 2026-04-09
---

# Phase 02 Plan 01: Hard Constraint Engine Summary

**Execution-ready rule/verdict contracts and five checker families for the first deterministic hard-constraint layer**

## Performance

- **Duration:** 13 min
- **Started:** 2026-04-09T08:14:00Z
- **Completed:** 2026-04-09T08:27:00Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments
- Added scope-targeted rule metadata and richer verdict evidence without forking the storage model
- Implemented family-separated checker modules for time, space, physics, causality, and character-state contradictions
- Proved the family-level behaviors with executable tests for impossible travel, missing causality, unexplained betrayal, and counter-motive exceptions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add execution-ready rule and verdict contracts** - `43f14e7` (feat)
2. **Task 2: Implement time, space, and physics checker modules** - `51f1514` (feat)
3. **Task 3: Implement causality and character checkers with family-level tests** - `0b90d53` (test)

**Plan metadata:** pending

## Files Created/Modified
- `src/domain/rules.ts` - optional `scopeTargetId` for executable scope binding
- `src/domain/verdicts.ts` - representative checker, reason code, supporting findings, and `notEvaluated` evidence schema
- `src/storage/migrations/0001_canonical_core.sql` - `scope_target_id` column on `rule_packs`
- `src/storage/repositories/rule-repository.ts` - rule scope target round-trip support
- `src/engine/types.ts` - shared checker/finding/evaluation contracts
- `src/engine/reason-codes.ts` - stable reason-code registry for checker families
- `src/engine/checkers/*.ts` - first-pass checker implementations across five rule families
- `tests/engine/checker-families.test.ts` - family-level regression coverage
- `tests/storage/persistence.test.ts` - persistence assertions for new rule/verdict payload fields

## Decisions Made
- Kept richer verdict structure inside the existing `evidence` JSONB payload instead of expanding the relational verdict schema in Phase 2
- Bound local rules to explicit target IDs so later precedence resolution can stay deterministic
- Let checker families emit findings directly rather than hiding rule semantics behind a monolithic engine entry point

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Tightened checker test fixtures to match canonical event typing**
- **Found during:** Task 3 (Implement causality and character checkers with family-level tests)
- **Issue:** The first draft of the checker-family fixtures widened temporal relation literals to plain strings, which broke strict TypeScript validation
- **Fix:** Typed all event fixtures as canonical events and tightened the checker array typing
- **Files modified:** `tests/engine/checker-families.test.ts`, `src/engine/checkers/space-checker.ts`
- **Verification:** `npm run typecheck` and `npx vitest run tests/storage/persistence.test.ts tests/engine/checker-families.test.ts` passed after the fix
- **Committed in:** `0b90d53` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No scope creep. The fix kept the new engine layer aligned with the canonical typing contract.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
Plan 02 can now focus on rule activation ordering and representative verdict aggregation on top of concrete checker outputs.
No blockers for `02-02`.

## Self-Check: PASSED

---
*Phase: 02-hard-constraint-engine*
*Completed: 2026-04-09*
