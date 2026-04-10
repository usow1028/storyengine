---
phase: 07-soft-prior-runtime-integration
plan: 03
subsystem: api-testing
tags: [soft-priors, ingestion-check, fastify, api-e2e, vitest]

requires:
  - phase: 07-soft-prior-runtime-integration
    provides: Plan 01 verdict-runner advisory hook and Plan 02 manual check/API softPrior response contract
  - phase: 05-natural-language-ingestion-and-review-api
    provides: Submit, extract, review, approve, and manual check ingestion workflow
provides:
  - Deterministic soft-prior ingestion fixture candidates for API E2E checks
  - Full Fastify submit/extract/review/approve/check regression with available softPrior output
  - Persisted hard verdict/run invariance comparison across disabled and enabled soft priors
affects: [SOFT-01, phase-07-verification, ingestion-api-regressions]

tech-stack:
  added: []
  patterns:
    - Server-side snapshotSet injection through buildStoryGraphApi dependencies for deterministic soft-prior E2E tests
    - API E2E compares persisted hard verdict projections while inspecting advisory softPrior response data separately

key-files:
  created:
    - tests/fixtures/soft-prior-ingestion-fixtures.ts
  modified:
    - tests/api/check-controls-api.test.ts

key-decisions:
  - "The primary SOFT-01 proof uses Fastify app.inject through submit, extract, review, approve, and check rather than static wiring checks."
  - "Soft-prior E2E fixture priors are injected through trusted server dependencies, not request payloads or global data/prior-snapshots state."
  - "Hard verdict invariance is asserted from persisted verdict and run repositories while advisory assessment fields are asserted only under softPrior."

patterns-established:
  - "Soft-Prior API E2E: build deterministic extraction candidates, review the segment boundary, approve, then run the real check route."
  - "Hard/Soft Separation Assertion: compare verdictKind, category, findingId, reasonCode, eventIds, createdAt, previousRunId, and triggerKind across disabled/enabled prior runs."

requirements-completed: [SOFT-01]

duration: 5 min
completed: 2026-04-10
---

# Phase 07 Plan 03: Soft-Prior API E2E Summary

**Fastify ingestion check E2E now proves available soft-prior advisories while persisted hard verdict data stays invariant.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-10T05:02:49Z
- **Completed:** 2026-04-10T05:07:52Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `buildSoftPriorCheckCandidates` with deterministic mage, `spell_cast`, and `instant_arrival` extraction candidates that promote into canonical events for the real ingestion flow.
- Added an import-backed fixture contract test that parses the canonical event payloads and checks the hard-verdict timing plus soft-prior token inputs.
- Added the primary API E2E regression that executes `POST /api/ingestion/submissions`, `POST /extract`, `PATCH /segments/:segmentId`, `POST /approve`, and `POST /check` through Fastify `app.inject()`.
- Proved enabled soft priors return `softPrior.status === "available"` with drift scores, thresholds, triggered drifts, dominant layer, representative summary, contributions, reranked repairs, and repair plausibility adjustments.
- Compared enabled and disabled pg-mem apps through `VerdictRepository.listForRun()` and `VerdictRunRepository.listRunsForRevision()` to prove hard verdict projection and run metadata invariance.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: soft-prior ingestion fixture contract test** - `6cb5877` (test)
2. **Task 1 GREEN: soft-prior ingestion fixture helper** - `4a3ffd7` (feat)
3. **Task 2: primary soft-prior API E2E regression** - `c766fd2` (test)

_Note: Task 2's new E2E passed immediately because Plans 07-01 and 07-02 had already supplied the runtime advisory hook, service propagation, and response schema. No production GREEN commit was needed._

## Files Created/Modified

- `tests/fixtures/soft-prior-ingestion-fixtures.ts` - Builds fixture extraction candidates compatible with `createConfiguredIngestionLlmClient`, including canonical `spell_cast` and `instant_arrival` event payloads.
- `tests/api/check-controls-api.test.ts` - Imports the fixture helper, asserts payload/token shape, runs the full soft-prior check API flow, and compares persisted hard verdict/run projections across disabled and enabled priors.

## Decisions Made

- Used the existing `buildSoftPriorArtifactsFixture()` artifact set to construct an in-memory `PriorSnapshotSet` for API tests, preserving D-04's fixture-injection boundary.
- Kept the review step meaningful by patching the segment boundary label to `Soft Prior Scene` before approval.
- Compared hard verdict stability through persisted repository rows rather than through returned advisory response fields.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Task 2 did not produce a failing RED run because upstream Plans 07-01 and 07-02 already implemented the runtime/API behavior needed by the new E2E. The test was still committed as the planned cross-phase regression proof.

## User Setup Required

None - no external service configuration required.

## Verification

- `npx vitest run tests/api/check-controls-api.test.ts -t "builds soft-prior ingestion candidates"` - PASSED, 1 file / 1 selected test.
- `npx vitest run tests/api/check-controls-api.test.ts -t "returns available soft-prior advisory output"` - PASSED, 1 file / 1 selected test.
- `npx vitest run tests/engine/verdict-runner.test.ts tests/api/check-controls-api.test.ts` - PASSED, 2 files / 7 tests.
- `npm run typecheck && npm run test:priors && npm run test:ingestion` - PASSED, typecheck plus 9 prior tests and 10 ingestion tests.
- Stub scan found no user-facing stubs, TODO, FIXME, placeholder text, or hardcoded empty UI data in the files created/modified by this plan.
- Threat scan found no new endpoint, auth path, persistence schema, or request-controlled prior configuration surface. The planned trusted `softPriorConfig.snapshotSet` test boundary remains server-side.

## Known Stubs

None.

## Next Phase Readiness

Phase 07 Plan 03 completes the required cross-phase SOFT-01 proof. The phase is ready for verification; shared phase tracking files were intentionally left untouched for the orchestrator per execution coordination.

## Self-Check: PASSED

- Confirmed `.planning/phases/07-soft-prior-runtime-integration/07-03-SUMMARY.md` exists.
- Confirmed `tests/fixtures/soft-prior-ingestion-fixtures.ts` exists.
- Confirmed task commits exist: `6cb5877`, `4a3ffd7`, `c766fd2`.

---
*Phase: 07-soft-prior-runtime-integration*
*Completed: 2026-04-10*
