---
phase: 07-soft-prior-runtime-integration
plan: 01
subsystem: services
tags: [soft-priors, verdict-runner, advisory-runtime, vitest]

requires:
  - phase: 04-corpus-priors-and-soft-pattern-layer
    provides: Corpus prior snapshots, soft-prior scoring, and repair reranking evaluator
  - phase: 05-natural-language-ingestion-and-review-api
    provides: Live verdict-run execution path and persisted hard verdict contracts
provides:
  - Status-wrapped soft-prior runtime advisory wrapper
  - Canonical event transition builder for soft-prior evaluation
  - Optional executeVerdictRun softPrior output after hard verdict persistence
affects: [07-02, ingestion-check, api-check-response, SOFT-01]

tech-stack:
  added: []
  patterns:
    - Advisory soft-prior results remain runtime-only and separate from hard verdict persistence
    - Runtime prior snapshots are explicit trusted config or injected fixture snapshotSet
    - Transition selection favors strongest max drift score, then contribution count, then sequence order

key-files:
  created:
    - src/services/soft-prior-runtime.ts
    - tests/services/soft-prior-runtime.test.ts
  modified:
    - src/services/index.ts
    - src/services/verdict-runner.ts
    - tests/engine/verdict-runner.test.ts

key-decisions:
  - "Soft-prior advisory evaluation runs after verdictRepository.saveMany(verdicts), so hard verdict rows and run metadata stay authoritative."
  - "Soft-prior runtime config stays server-side through softPriorConfig with snapshotSet injection for deterministic tests."
  - "Unavailable prior states are explicit statuses instead of hard-run failures."

patterns-established:
  - "Advisory Runtime Boundary: return status-wrapped softPrior data without persisting or exposing raw prior artifacts."
  - "Transition Token Parity: runtime state tokens use field:operation:String(value ?? unknown) to mirror corpus priors."

requirements-completed: [SOFT-01]

duration: 7 min
completed: 2026-04-10
---

# Phase 07 Plan 01: Soft-Prior Runtime Advisory Integration Summary

**Status-wrapped soft-prior advisory evaluation wired into verdict runs after hard verdict persistence**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-10T04:43:26Z
- **Completed:** 2026-04-10T04:50:04Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added `src/services/soft-prior-runtime.ts` with `SoftPriorRuntimeConfig`, explicit advisory statuses, deterministic transition construction, and evaluator error wrapping for disabled, missing, invalid, and insufficient prior cases.
- Exported the runtime wrapper through `src/services/index.ts` so later service/API propagation can reuse the same advisory contract.
- Extended `executeVerdictRun` to return `softPrior` after `verdictRepository.saveMany(verdicts)` and before returning the runtime result, with no repository writes after advisory evaluation.
- Added pg-mem regression coverage proving enabled soft priors do not change persisted hard verdict projections or verdict-run metadata.

## Task Commits

Each TDD task was committed atomically:

1. **Task 1 RED: soft-prior runtime behavior tests** - `12ab044` (test)
2. **Task 1 GREEN: soft-prior runtime wrapper** - `f4624c6` (feat)
3. **Task 2 RED: verdict-runner advisory/invariance tests** - `e516218` (test)
4. **Task 2 GREEN: verdict-runner advisory hook** - `7be0eb8` (feat)

## Files Created/Modified

- `src/services/soft-prior-runtime.ts` - Adds the advisory status/result types, transition builder, snapshot-source handling, strongest-transition selection, and safe evaluator wrapper.
- `src/services/index.ts` - Exports the new soft-prior runtime module.
- `src/services/verdict-runner.ts` - Accepts optional `softPriorConfig`, generates repair candidates from hard verdict evidence, selects the highest-priority hard verdict kind, and returns `softPrior` after hard persistence.
- `tests/services/soft-prior-runtime.test.ts` - Covers transition-token parity and disabled/missing/invalid advisory status handling.
- `tests/engine/verdict-runner.test.ts` - Covers disabled/default status, available configured status, and hard persistence invariance across enabled and disabled runs.

## Decisions Made

- Soft-prior output remains runtime-only in Plan 01; verdict rows and verdict-run rows are unchanged.
- Missing or malformed prior artifacts are advisory status values, not hard-check failures.
- Runtime transition input uses sorted adjacent canonical events and corpus-compatible token shapes to preserve Phase 4 scoring semantics.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Verification

- `npx vitest run tests/services/soft-prior-runtime.test.ts tests/engine/verdict-runner.test.ts` - PASSED, 2 files / 8 tests.
- `npx vitest run tests/engine/verdict-runner.test.ts tests/api/check-controls-api.test.ts` - PASSED, 2 files / 4 tests.
- `npm run typecheck` - PASSED.
- Stub scan found only local test/runtime accumulator arrays; no user-facing stubs or TODO/FIXME placeholders were introduced.
- Threat scan found no new unplanned network endpoint, auth path, file-access pattern, or persistence schema surface beyond the planned trusted `softPriorConfig.snapshotDir` / `snapshotSet` boundary.

## Next Phase Readiness

Plan 01 is ready for Plan 02. The runtime now returns a stable `softPrior` advisory block that `executeIngestionCheck` and the Fastify check response schema can propagate without changing hard verdict persistence.

## Self-Check: PASSED

- Confirmed `src/services/soft-prior-runtime.ts` exists.
- Confirmed `tests/services/soft-prior-runtime.test.ts` exists.
- Confirmed `.planning/phases/07-soft-prior-runtime-integration/07-01-SUMMARY.md` exists.
- Confirmed task commits exist: `12ab044`, `f4624c6`, `e516218`, `7be0eb8`.

---
*Phase: 07-soft-prior-runtime-integration*
*Completed: 2026-04-10*
