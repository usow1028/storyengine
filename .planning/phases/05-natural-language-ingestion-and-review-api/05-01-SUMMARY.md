---
phase: 05-natural-language-ingestion-and-review-api
plan: 01
subsystem: api
tags: [fastify, ingestion, review-session, zod, pg]
requires: []
provides:
  - Persisted ingestion sessions, segments, and advisory candidates separate from canonical storage
  - Deterministic chunk and full-draft segmentation plus single-model extraction normalization
  - Submit/extract/read API routes with injection-tested workflow state exposure
affects: [phase-05-natural-language-ingestion-and-review-api, ingestion-review, manual-check]
tech-stack:
  added: [fastify]
  patterns: [advisory-ingestion-sessions, deterministic-draft-segmentation, thin-fastify-zod-routes]
key-files:
  created:
    - src/domain/ingestion.ts
    - src/storage/migrations/0003_ingestion_review.sql
    - src/storage/repositories/ingestion-session-repository.ts
    - src/services/ingestion-session.ts
    - src/api/app.ts
    - tests/api/ingestion-review-api.test.ts
  modified:
    - src/domain/index.ts
    - src/storage/index.ts
    - src/storage/schema.ts
    - src/services/index.ts
    - package.json
    - package-lock.json
key-decisions:
  - "Submit and extract stay advisory only; canonical story, rule, and verdict persistence are deferred to review approval."
  - "Full drafts are split deterministically into reviewable segments before extraction output is exposed."
  - "Every extraction candidate keeps confidence, source span, and review-needed state in durable ingestion storage."
patterns-established:
  - "Natural-language intake now lands in ingestion_sessions, ingestion_segments, and ingestion_candidates rather than canonical tables."
  - "Fastify routes validate with Zod, delegate to services, and serialize workflow-state snapshots without hidden side effects."
requirements-completed: [FLOW-01]
duration: 13 min
completed: 2026-04-10
---

# Phase 05 Plan 01: Natural-Language Ingestion and Review API Summary

**Advisory ingestion sessions with deterministic draft segmentation, normalized extraction candidates, and Fastify submit/extract/read endpoints**

## Performance

- **Duration:** 13 min
- **Started:** 2026-04-10T02:25:09+09:00
- **Completed:** 2026-04-10T02:38:38+09:00
- **Tasks:** 3
- **Files modified:** 19

## Accomplishments
- Added explicit ingestion session, segment, and candidate contracts plus dedicated persistence tables outside canonical storage
- Implemented deterministic chunk/full-draft segmentation and advisory extraction normalization with confidence and provenance metadata
- Exposed submit/extract/read ingestion routes through a thin Fastify app and protected them with storage, service, and API regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Define ingestion contracts and review-session persistence schema** - `d34cacd` (feat)
2. **Task 2: Implement deterministic segmentation and advisory extraction orchestration** - `c0ab2e7` (feat)
3. **Task 3: Add the submit/extract/read Fastify surface and deterministic regressions** - `7bf90db` (test)

**Plan metadata:** `802d8a9` (docs)

## Files Created/Modified
- `src/domain/ingestion.ts` - Phase 5 ingestion state machine, candidate contracts, and snapshot schemas
- `src/storage/migrations/0003_ingestion_review.sql` - Dedicated ingestion session, segment, and candidate tables
- `src/storage/repositories/ingestion-session-repository.ts` - Review-session persistence and snapshot loading
- `src/services/ingestion-llm-client.ts` - Single-model extraction client contract
- `src/services/ingestion-session.ts` - Submission, segmentation, extraction, and snapshot orchestration
- `src/api/app.ts` - Fastify app factory for ingestion routes
- `src/api/schemas.ts` - Submit/extract/read request and response schemas
- `src/api/routes/ingestion-submit.ts` - `POST /api/ingestion/submissions`
- `src/api/routes/ingestion-extract.ts` - `POST /api/ingestion/submissions/:sessionId/extract`
- `src/api/routes/ingestion-read.ts` - `GET /api/ingestion/submissions/:sessionId`
- `tests/storage/ingestion-session-repository.test.ts` - Persistence round-trip coverage for corrected payloads and source spans
- `tests/services/natural-language-extraction.test.ts` - Segmentation and `needs_review` routing regressions
- `tests/api/ingestion-review-api.test.ts` - Injection-tested submit/extract/read workflow coverage

## Decisions Made
- Reserved `story:draft:<sessionId>` and `revision:draft:<sessionId>` IDs for new draft sessions so later approval can promote into stable canonical targets
- Marked extraction output as `needs_review` on low confidence, canonical-key conflicts, or normalization failure rather than silently coercing candidates
- Kept API handlers thin and returned session snapshots so clients always read the same persisted workflow state the backend uses internally

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
Phase 05 now has a durable natural-language intake boundary with explicit workflow states and review-session persistence.
Plan `05-02` can build structured patching, approval-driven canonical promotion, and manual checks on top of this surface.

## Self-Check: PASSED

---
*Phase: 05-natural-language-ingestion-and-review-api*
*Completed: 2026-04-10*
