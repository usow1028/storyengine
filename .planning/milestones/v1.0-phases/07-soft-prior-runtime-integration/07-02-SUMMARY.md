---
phase: 07-soft-prior-runtime-integration
plan: 02
subsystem: api
tags: [soft-priors, ingestion-check, fastify, zod, vitest]

requires:
  - phase: 07-soft-prior-runtime-integration
    provides: Plan 01 verdict-runner soft-prior advisory hook and runtime wrapper
provides:
  - Manual ingestion checks return verdict-run soft-prior advisory results
  - Fastify API dependencies accept trusted server-side soft-prior configuration
  - Check response schema preserves a separate softPrior advisory block
  - Service regressions prove disabled and missing snapshots do not block hard checks
affects: [phase-07-plan-03, api-contracts, ingestion-check, soft-prior-runtime]

tech-stack:
  added: []
  patterns:
    - Trusted server-side softPriorConfig dependency boundary
    - Separate Zod response schema for advisory soft-prior output
    - Runtime-only advisory unavailability shape with reason and empty evidence arrays

key-files:
  created:
    - tests/services/ingestion-check-soft-prior.test.ts
  modified:
    - src/services/ingestion-check.ts
    - src/services/soft-prior-runtime.ts
    - src/api/app.ts
    - src/api/schemas.ts
    - tests/api/check-controls-api.test.ts

key-decisions:
  - "Soft-prior configuration remains server-side dependency data and is not accepted through request schemas."
  - "Unavailable advisory states use explicit reason, null assessment, and empty repair arrays so response parsing can retain a stable softPrior block."
  - "Manual check top-level fields remain unchanged while softPrior is exposed as a separate advisory block."

patterns-established:
  - "API response schemas must explicitly retain advisory fields that clients inspect."
  - "Unavailable soft-prior states are non-blocking and still allow checked workflow completion with a persisted hard verdict run."

requirements-completed: [SOFT-01]

duration: 6 min
completed: 2026-04-10
---

# Phase 07 Plan 02: Soft-Prior Check API Contract Summary

**Manual ingestion checks now carry a separate softPrior advisory block through service and Fastify response contracts without letting request payloads configure prior snapshots.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-10T04:53:01Z
- **Completed:** 2026-04-10T04:59:14Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- `executeIngestionCheck` now passes trusted `softPriorConfig` into `executeVerdictRun` and returns `softPrior` beside the existing hard check metadata.
- `StoryGraphApiDependencies` now exposes optional server-side `softPriorConfig` while request schemas continue to strip `snapshotDir`, `snapshotSet`, `genreWeights`, and `worldProfile`.
- `CheckIngestionResponseSchema` now explicitly preserves available and unavailable `softPrior` advisory blocks, including repair plausibility adjustment data.
- Service regressions prove disabled and missing prior snapshots still produce `workflowState: "checked"`, one persisted verdict run, and `lastVerdictRunId` linkage.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: soft-prior check response contract tests** - `853c548` (test)
2. **Task 1 GREEN: service/API soft-prior response propagation** - `df6a126` (feat)
3. **Task 2: ingestion check unavailable-status regressions** - `b6f4e59` (test)

_Note: Task 2 tests passed immediately because Task 1's implementation already satisfied the required service behavior; no additional GREEN source commit was needed._

## Files Created/Modified

- `src/services/ingestion-check.ts` - Propagates trusted `softPriorConfig` into verdict runs and returns `softPrior` in manual check results.
- `src/services/soft-prior-runtime.ts` - Enriches unavailable advisory results with reason, null assessment, and empty repair evidence arrays.
- `src/api/app.ts` - Adds optional server-side `softPriorConfig` to API dependencies.
- `src/api/schemas.ts` - Adds `SoftPriorAdvisoryResponseSchema` and includes it on `CheckIngestionResponseSchema`.
- `tests/api/check-controls-api.test.ts` - Covers API response retention and confirms request schemas do not accept prior config fields.
- `tests/services/ingestion-check-soft-prior.test.ts` - Covers disabled and missing snapshot service behavior with pg-mem repositories.

## Decisions Made

- Prior snapshot configuration stays out of request bodies and enters only through trusted server dependencies.
- Soft-prior unavailability is represented as explicit advisory data rather than as a thrown error or omitted field.
- The existing top-level hard check fields remain compatible; clients inspect soft priors only under `softPrior`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Enriched unavailable soft-prior runtime results for response schema compatibility**
- **Found during:** Task 1 (Propagate `softPrior` through manual check service and response schema)
- **Issue:** Plan 02 required unavailable response states to carry `reason`, `assessment: null`, `rerankedRepairs: []`, and `repairPlausibilityAdjustments: []`, but the Plan 01 runtime returned only `{ status }` for unavailable states.
- **Fix:** Added a shared unavailable-result helper and populated the stable advisory fields for `disabled`, `missing_snapshot`, `invalid_snapshot`, and `insufficient_context`.
- **Files modified:** `src/services/soft-prior-runtime.ts`
- **Verification:** `npx vitest run tests/api/check-controls-api.test.ts`; full plan verification commands below.
- **Committed in:** `df6a126`

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug)
**Impact on plan:** Required for the planned API response schema to parse real service output. No persistence, endpoint, or request-surface expansion was added.

## Issues Encountered

- Task 2's RED phase did not fail because Task 1's GREEN implementation already fulfilled the unavailable-status service behavior. The new service file was still committed as regression coverage for D-11.

## User Setup Required

None - no external service configuration required.

## Verification

- `npx vitest run tests/api/check-controls-api.test.ts` - PASSED, 1 file / 2 tests.
- `npx vitest run tests/services/ingestion-check-soft-prior.test.ts tests/api/check-controls-api.test.ts` - PASSED, 2 files / 4 tests.
- `npx vitest run tests/engine/verdict-runner.test.ts tests/api/check-controls-api.test.ts` - PASSED, 2 files / 5 tests.
- `npm run typecheck` - PASSED.
- `npm run test:priors` - PASSED, 4 files / 9 tests.
- `npm run test:ingestion` - PASSED, 5 files / 8 tests.
- Stub scan found only local accumulator arrays in runtime/test code; no user-facing stubs, TODO, FIXME, placeholder, or mock-only production output was introduced.
- Threat scan found no new unplanned endpoint, auth path, persistence schema, or request-supplied prior configuration surface. The planned server-side `softPriorConfig`/snapshot access boundary was covered by tests.

## Next Phase Readiness

Plan 02 is ready for Plan 03. The manual check API now exposes the advisory runtime block, and the next plan can focus on configured available-prior API/E2E coverage without changing hard verdict persistence.

## Self-Check: PASSED

- Confirmed `.planning/phases/07-soft-prior-runtime-integration/07-02-SUMMARY.md` exists.
- Confirmed `tests/services/ingestion-check-soft-prior.test.ts` exists.
- Confirmed task commits exist: `853c548`, `df6a126`, `b6f4e59`.

---
*Phase: 07-soft-prior-runtime-integration*
*Completed: 2026-04-10*
