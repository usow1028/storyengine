---
phase: 08-interactive-inspection-surface
plan: 03
subsystem: api
tags: [typescript, zod, fastify, postgres, pg-mem, inspection, soft-priors]

# Dependency graph
requires:
  - phase: 08-interactive-inspection-surface
    provides: sanitized run inspection snapshots from plan 08-02
  - phase: 07-soft-prior-runtime-integration
    provides: advisory soft-prior output that remains separate from hard verdicts
provides:
  - Run-scoped inspection payload builder
  - Sanitized Fastify inspection endpoint
  - Final read-side inspection DTO fields for UI plans
  - Service and API regression coverage for grouping, detail, diff, fallback, and redaction
affects: [08-interactive-inspection-surface, inspection-ui, inspection-api, FLOW-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Zod-validated API response DTOs
    - Run-scoped read endpoints with stable 400/404 JSON
    - Persisted advisory read path with no prior recomputation

key-files:
  created:
    - src/api/routes/inspection.ts
    - tests/services/inspection-payload.test.ts
    - tests/api/inspection-api.test.ts
  modified:
    - src/domain/inspection.ts
    - src/services/inspection-payload.ts
    - src/api/app.ts
    - src/api/schemas.ts

key-decisions:
  - "Use persisted verdict-run inspection snapshots as the only advisory source for read APIs."
  - "Expose deterministic verdict, evidence summary, repairs, advisory, trace, timeline, and diff as separate DTO branches."
  - "Keep the endpoint run-scoped and return stable JSON for missing or invalid run IDs."

patterns-established:
  - "Inspection groups are built by `VERDICT_KIND_ORDER.map`, preserving empty groups for UI triage."
  - "Repair candidates are attached to verdict details only when `sourceFindingIds` matches the finding ID."
  - "Repair plausibility adjustments are joined by `repairId` on the read DTO, not recomputed."

requirements-completed: [FLOW-02]

# Metrics
duration: 14min
completed: 2026-04-10
---

# Phase 08 Plan 03: Inspection Payload and API Summary

**Run-scoped inspection JSON for grouped verdict triage, traceable detail, repair suggestions, advisory signal, and previous-run diff**

## Performance

- **Duration:** 14 min
- **Started:** 2026-04-10T10:04:56Z
- **Completed:** 2026-04-10T10:08:56Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added `buildRunInspectionPayload`, which loads an existing verdict run, persisted inspection snapshot, verdict rows, and previous-run diff into a stable browser DTO.
- Added fixed-order verdict grouping for `Hard Contradiction`, `Repairable Gap`, `Soft Drift`, and `Consistent`, including zero-count groups.
- Added traceable verdict details with deterministic fields, evidence summary, sorted event timeline, matched repairs, plausibility adjustments, advisory data, trace fields, and diff data in separate branches.
- Added `GET /api/inspection/runs/:runId` with Zod param parsing, stable 400/404 JSON, and response parsing through the domain DTO schema.
- Added service and API tests for DTO shape, default selection, snapshot fallback, redaction, route success, missing run, and malformed run ID behavior.

## Task Commits

Each TDD task was committed atomically:

1. **Task 1 RED: Inspection payload service tests** - `88c31bd` (test)
2. **Task 1 GREEN: Inspection payload service** - `447b1d7` (feat)
3. **Task 2 RED: Inspection API tests** - `b909ac0` (test)
4. **Task 2 GREEN: Inspection API route** - `233b97a` (feat)

## Files Created/Modified

- `src/domain/inspection.ts` - Finalized read-side DTO fields for deterministic verdict, evidence summary, repairs with plausibility adjustment, detail diff, and related event IDs.
- `src/services/inspection-payload.ts` - Builds run-scoped inspection payloads from repositories and persisted snapshots without prior recomputation.
- `src/api/routes/inspection.ts` - Registers `GET /api/inspection/runs/:runId`.
- `src/api/app.ts` - Registers the inspection route after existing ingestion routes.
- `src/api/schemas.ts` - Re-exports `RunInspectionResponseSchema` and adds `InspectionRunParamsSchema`.
- `tests/services/inspection-payload.test.ts` - Covers grouping, selected default, detail shaping, snapshot fallback, diff inclusion, and redaction.
- `tests/api/inspection-api.test.ts` - Covers Fastify `app.inject()` success, 404, 400, hard/soft separation, and response redaction.

## Decisions Made

- The read path uses `getInspectionSnapshot` and never calls prior loaders or evaluators, preserving historical advisory output exactly as stored at check time.
- The response schema remains in `src/domain/inspection.ts` so API and UI plans share one source of truth instead of duplicating DTO contracts.
- Invalid run IDs return `{ message: "Invalid inspection run id." }`; absent valid run IDs return `{ message: "Inspection run not found." }`.

## Deviations from Plan

The plan's file list did not include `src/domain/inspection.ts`, but the task required the final Plan 08-03 DTO shape (`deterministicVerdict`, `evidenceSummary`, `repairs`, `diff`) to be parseable by `RunInspectionResponseSchema`. The schema was updated in place to keep the API and downstream UI contract consistent. No scope outside the planned inspection DTO/API surface was added.

## Issues Encountered

- The API redaction test originally treated `worldProfile` contribution evidence as a response leak. The final source-level guard remains the planned request-schema check, while the response redaction test focuses on raw prior/storage artifacts and server config carriers that should never be exposed.

## Verification

- `npm run test -- tests/services/inspection-payload.test.ts` - PASS, 4 tests.
- `npm run test -- tests/api/inspection-api.test.ts` - PASS, 3 tests.
- `npm run typecheck && npm run test -- tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts` - PASS, 7 tests.
- `rg "evaluateConfiguredSoftPrior|evaluateSoftPriors|loadPriorSnapshot" src/services/inspection-payload.ts src/api/routes/inspection.ts` - PASS, no matches.
- `rg "sourceWorkIds|snapshotDir|snapshotSet" src/api src/services/inspection-payload.ts` - PASS, no matches.
- `rg "snapshotDir|snapshotSet|genreWeights|worldProfile" src/api/routes/inspection.ts src/api/schemas.ts` - PASS, no matches.

## Known Stubs

None. No TODO/FIXME/placeholder text was added to touched source files.

## Threat Flags

None. T-08-09 through T-08-13 were addressed with param validation, stable absent-run responses, DTO shaping instead of raw rows, hard/advisory separation, run-scoped access, and explicit trace fields.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 08-04 can consume `RunInspectionResponse` from the API/client boundary and render grouped verdict triage plus selected deterministic detail. Plan 08-05 can use the detail `timeline`, `trace`, `repairs`, and `advisory` branches without changing the read API.

---
*Phase: 08-interactive-inspection-surface*
*Completed: 2026-04-10*

## Self-Check: PASSED

- Created files exist: `src/api/routes/inspection.ts`, `tests/services/inspection-payload.test.ts`, `tests/api/inspection-api.test.ts`, and this summary.
- Task commits exist: `88c31bd`, `447b1d7`, `b909ac0`, and `233b97a`.
- Verification commands passed: service tests, API tests, typecheck, no-prior-recompute grep, and production redaction grep.
