---
phase: 09-draft-container-and-segment-scope-model
plan: 03
subsystem: api
tags: [fastify, zod, ingestion, drafts]
requires:
  - phase: 09-01
    provides: draft planner, section contracts, and LF-normalized source refs
  - phase: 09-02
    provides: persisted draft tables, scope rows, and legacy snapshot synthesis
provides:
  - additive draft-aware submit request and response schemas
  - draft metadata serialization on submit/read responses
  - submit flow that persists draft plans before segment rows
affects: [phase-10, phase-11, ingestion-api]
tech-stack:
  added: []
  patterns:
    - additive API envelopes
    - submit-plan-first persistence
    - legacy chunk compatibility with draft metadata synthesis
key-files:
  created: []
  modified:
    - src/api/schemas.ts
    - src/api/routes/ingestion-submit.ts
    - src/services/ingestion-session.ts
    - tests/api/ingestion-review-api.test.ts
    - tests/api/check-controls-api.test.ts
key-decisions:
  - "Expose draft metadata as additive API fields rather than replacing existing submit/read fields."
  - "Map nested `draft` request data onto the existing submit service instead of creating a separate chapter-submit endpoint."
  - "Persist the draft plan before segment rows so source refs and scope records are available on the first read."
patterns-established:
  - "Legacy chunk submissions still receive a compatibility draft object in API responses."
  - "Phase 9 keeps check execution scope-free; explicit scope execution stays deferred to Phase 11."
requirements-completed: [DRAFT-01, DRAFT-03]
duration: 2 min
completed: 2026-04-11
---

# Phase 09 Plan 03: Draft API Contracts and Submit Wiring Summary

**Submit and read responses now serialize draft hierarchy, scopes, and source references while submit persistence stores the draft plan before any segment rows are written**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-11T03:49:30Z
- **Completed:** 2026-04-11T03:51:38Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Extended the API request schema to accept nested draft metadata and the response schema to emit `draft`, `sections`, `scopes`, `draftPath`, and `sourceTextRef` additively.
- Updated the submit route and service so chapter-scale submissions preserve explicit document/revision IDs and write draft plans before segment persistence.
- Proved backward compatibility with targeted API tests and the full `npm run test:ingestion` gate, including chunk submit/extract/approve/check without any `scope` payload.

## Task Commits

Each task was committed atomically:

1. **Task 09-03-01: Add API regression coverage for draft serialization and chunk compatibility** - `eb4a743` (test)
2. **Task 09-03-02: Extend additive submit/read schemas and submit route mapping** - `c9f6bf8` (feat)
3. **Task 09-03-03: Wire submit persistence and run ingestion compatibility gate** - `ab10d47` (feat)

## Files Created/Modified
- `src/api/schemas.ts` - Additive request and response schemas for draft metadata, sections, scopes, and segment source references.
- `src/api/routes/ingestion-submit.ts` - Nested draft request data mapped into the existing submit service.
- `src/services/ingestion-session.ts` - Submit flow now plans and persists draft metadata before saving segments.
- `tests/api/ingestion-review-api.test.ts` - Chapter-scale serialization and legacy chunk response coverage.
- `tests/api/check-controls-api.test.ts` - Regression proving approved chunk checks still do not require a `scope` payload.

## Decisions Made
- Kept the API additive: old top-level fields remain present while new draft metadata appears alongside them.
- Routed `draft.documentId`, `draft.draftRevisionId`, and `draft.title` through the existing submit path to avoid splitting ingestion behavior across multiple endpoints.
- Locked Phase 9 to persistence and serialization only; scoped check execution remains deferred so hard-verdict behavior stays unchanged.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 10 can now target selected segments and partial review state on top of explicit draft/session/segment metadata already exposed through the API.
- Phase 11 can build explicit approved-scope validation on persisted `draft_check_scopes` without changing the current check request contract.

---
*Phase: 09-draft-container-and-segment-scope-model*
*Completed: 2026-04-11*
