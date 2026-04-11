---
phase: 11-scoped-checks-and-revision-diff
plan: 03
subsystem: api
tags: [scoped-checks, inspection, api, zod, vitest]
requires:
  - phase: 11-scoped-checks-and-revision-diff
    provides: scope-aware verdict runs and deterministic comparisonScopeKey persistence from Plans 11-01 and 11-02
provides:
  - additive scoped-check API request and response contracts
  - explicit inspection diff selectors with stable 404/409 JSON mapping
  - full Phase 11 API validation coverage for scoped execution and finding-level diff traces
affects: [check-controls-api, inspection-api, inspection-payload, ingestion-check]
tech-stack:
  added: []
  patterns:
    - parse additive request and query schemas once at the route boundary, then forward deterministic selectors into existing services
    - keep hard verdicts and soft-prior advisory output separated while exposing scope identifiers on public API responses
key-files:
  created: []
  modified:
    - src/api/schemas.ts
    - src/api/routes/ingestion-check.ts
    - src/api/routes/inspection.ts
    - src/services/ingestion-check.ts
    - tests/api/check-controls-api.test.ts
    - tests/api/inspection-api.test.ts
key-decisions:
  - "POST /check accepts optional scopeId, returns scopeId and comparisonScopeKey, and keeps the existing full-session fail-closed gate when scopeId is omitted."
  - "GET /api/inspection/runs/:runId accepts either baseRunId or baseRevisionId, never both, and maps missing comparable runs to stable 404/409 JSON without leaking internals."
  - "Phase 11 validation closes with the standard typecheck, reasoning, ingestion, and inspection payload/API suites instead of a separate ad-hoc gate."
patterns-established:
  - "Public API contracts remain additive: existing callers still work without scopeId or explicit diff selectors."
  - "Scope-labeled findingChanges expose canonical trace ids and scope metadata directly, rather than leaking full inspection snapshots."
requirements-completed: [DRAFT-02, CHECK-01, DIFF-01, TRACE-01]
duration: 24 min
completed: 2026-04-11
---

# Phase 11 Plan 03: Scoped Check and Inspection API Summary

**The public API now exposes scoped `/check` execution, explicit inspection diff selectors, and the final Phase 11 validation gate**

## Performance

- **Duration:** 24 min
- **Completed:** 2026-04-11
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Added scoped-check API regressions that prove a selected approved scope can run even when another section remains unresolved, while stale scoped segments still fail closed with `409`.
- Extended the inspection API surface with additive query parsing for `baseRunId` and `baseRevisionId`, plus stable `404`/`409` JSON error mapping for missing or incompatible comparisons.
- Closed the full Phase 11 gate with repository typecheck, reasoning, ingestion, and inspection payload/API regressions all green.

## Task Commits

Each implementation task was captured atomically where code changed:

1. **Task 11-03-01: Add scoped-check API regressions and additive request schema** - `868e9dc` `feat(11-03): add scoped check api contracts`
2. **Task 11-03-02: Add explicit inspection diff selectors and scope-labeled API regressions** - `82a5150` `feat(11-03): expose explicit inspection diff selectors`
3. **Task 11-03-03: Run the full Phase 11 gate and close contract gaps** - No corrective code changes required after the validation gate passed cleanly

## Files Created/Modified

- `src/api/schemas.ts` - Adds the scoped check request schema, explicit inspection selector query schema, and additive scoped response fields.
- `src/api/routes/ingestion-check.ts` - Parses `scopeId` once, forwards it into the deterministic check service, and keeps `409` conflict handling stable.
- `src/services/ingestion-check.ts` - Returns `scopeId` and `comparisonScopeKey` so scoped runs are identifiable to API callers.
- `tests/api/check-controls-api.test.ts` - Proves scoped success, stale-scope rejection, and preserved full-session blocking when `scopeId` is omitted.
- `src/api/routes/inspection.ts` - Accepts explicit base selectors and maps missing or incompatible comparisons to stable public JSON.
- `tests/api/inspection-api.test.ts` - Proves scope-labeled `findingChanges` for explicit `baseRunId` and `409` rejection for incompatible `baseRevisionId`.

## Decisions Made

- Kept the public `/check` contract additive instead of creating a separate scoped-check endpoint, preserving the existing submit/extract/review/approve/check mental model.
- Treated incompatible revision comparisons as `409` conflicts and explicit missing base runs as `404`, matching the deterministic diff-selection semantics introduced in Plan 11-02.
- Reused the existing inspection payload serializer so the API exposes `findingChanges`, scope ids, and comparison scope keys without leaking advisory internals or full evidence dumps.

## Deviations from Plan

None. The final validation gate passed without requiring follow-up corrections after the API contracts landed.

## Verification

- `npm exec -- vitest run tests/api/check-controls-api.test.ts --bail=1`
- `npm exec -- vitest run tests/api/inspection-api.test.ts --bail=1`
- `node .codex/get-shit-done/bin/gsd-tools.cjs verify key-links .planning/phases/11-scoped-checks-and-revision-diff/11-03-PLAN.md`
- `npm run typecheck`
- `npm run test:reasoning`
- `npm run test:ingestion`
- `npm exec -- vitest run tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts --bail=1`

## Next Phase Readiness

- Phase 11 is now ready for phase-level review and verification closure with all three plans implemented.
- Phase 12 can build grouped inspection UX and operational guardrails on top of stable scoped-check and revision-diff API contracts.

## Self-Check: PASSED

- Verified `.planning/phases/11-scoped-checks-and-revision-diff/11-03-SUMMARY.md` exists.
- Verified task commits `868e9dc` and `82a5150` exist in `git log --oneline --all`.
- Verified the full Phase 11 gate passed without additional fixes.

---
*Phase: 11-scoped-checks-and-revision-diff*
*Completed: 2026-04-11*
