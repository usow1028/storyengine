---
phase: 05-natural-language-ingestion-and-review-api
plan: 02
subsystem: api
tags: [ingestion-review, provenance, fastify, verdict-runner, vitest]
requires:
  - phase: 05-01
    provides: advisory ingestion sessions, extracted candidates, submit-extract-read api
provides:
  - Structured review patch persistence with separate extracted and corrected payloads
  - Segment approval that promotes only approved candidates into canonical repositories
  - Explicit manual check endpoint that reuses verdict execution only after approval
affects: [phase-05-natural-language-ingestion-and-review-api, review-api, manual-check, provenance]
tech-stack:
  added: []
  patterns: [approval-gated-promotion, corrected-vs-extracted-audit-trail, explicit-manual-check-route]
key-files:
  created:
    - src/services/ingestion-review.ts
    - src/services/ingestion-check.ts
    - src/api/routes/ingestion-review.ts
    - src/api/routes/ingestion-check.ts
    - tests/services/ingestion-review-workflow.test.ts
    - tests/api/check-controls-api.test.ts
  modified:
    - src/domain/ingestion.ts
    - src/storage/repositories/ingestion-session-repository.ts
    - src/storage/repositories/provenance-repository.ts
    - src/api/app.ts
    - src/api/schemas.ts
    - src/services/index.ts
    - package.json
    - tests/storage/ingestion-session-repository.test.ts
    - tests/api/ingestion-review-api.test.ts
key-decisions:
  - "Review patches preserve extracted payloads and recompute normalized payloads from corrected structured input."
  - "Canonical promotion happens only from the segment approval path, not from submit, extract, patch, or read."
  - "Manual consistency checks stay on a dedicated endpoint and reuse executeVerdictRun with triggerKind manual."
patterns-established:
  - "Approved ingestion segments are the only bridge from temporary review storage into canonical repositories."
  - "Provenance records carry sessionId, segmentId, candidateId, source spans, extracted payload, and corrected payload for promoted records."
requirements-completed: [FLOW-01, FLOW-03]
duration: 10 min
completed: 2026-04-10
---

# Phase 05 Plan 02: Natural-Language Ingestion and Review API Summary

**Structured review patches, approval-gated canonical promotion, and explicit manual check controls for ingestion sessions**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-10T02:39:00+09:00
- **Completed:** 2026-04-10T02:49:23+09:00
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments
- Added structured review patch contracts and repository methods that keep extracted values, corrected overlays, and normalized payloads distinct
- Promoted approved segment data into canonical story and rule repositories with provenance trails tied back to session and candidate source spans
- Added review and check API routes plus end-to-end regressions proving `needs_review -> partially_approved -> approved -> checked`

## Task Commits

Each task was committed atomically where file boundaries allowed:

1. **Task 1 + Task 2: Add review patch persistence, approval promotion, and manual check services/routes** - `39f177b` (feat)
2. **Task 3: Add correction-loop and manual-check regressions plus the ingestion test command** - `9d3fe9f` (test)

**Plan metadata:** `802d8a9` (docs)

## Files Created/Modified
- `src/domain/ingestion.ts` - review patch and approval result schemas
- `src/storage/repositories/ingestion-session-repository.ts` - patch, approval, approved-segment listing, and session-state recomputation
- `src/storage/repositories/provenance-repository.ts` - provenance owner coverage for promoted causal links
- `src/services/ingestion-review.ts` - structured patch application and approval-driven canonical promotion
- `src/services/ingestion-check.ts` - explicit manual check orchestration
- `src/api/app.ts` - review and check route registration with canonical repository dependencies
- `src/api/schemas.ts` - review patch and manual check response schemas plus richer candidate payload serialization
- `src/api/routes/ingestion-review.ts` - patch and approve endpoints
- `src/api/routes/ingestion-check.ts` - explicit `POST /api/ingestion/submissions/:sessionId/check`
- `tests/storage/ingestion-session-repository.test.ts` - correctedPayload preservation and `partially_approved` regressions
- `tests/services/ingestion-review-workflow.test.ts` - canonical promotion and provenance workflow coverage
- `tests/api/ingestion-review-api.test.ts` - full review-loop workflow coverage
- `tests/api/check-controls-api.test.ts` - 409-before-approval and checked-after-manual-check coverage
- `package.json` - expanded non-watch `test:ingestion` command

## Decisions Made
- Review responses now surface extracted, corrected, and normalized payloads because structured field editing is impossible if the API hides the structures being reviewed
- `approveReviewedSegment` promotes only the targeted segment, so unapproved segments cannot leak into canonical storage
- Manual checks remain explicit even after approval; approval updates canonical state, but verdict execution stays opt-in

## Deviations from Plan

### Auto-fixed Issues

**1. Task 1 and Task 2 shared the same promotion service surface**
- **Found during:** Plan execution
- **Issue:** `src/services/ingestion-review.ts` spans both structured patch handling and approval-time promotion, so file boundaries did not support a clean non-interactive split without partial staging
- **Fix:** Combined Task 1 and Task 2 into a single feature commit while keeping Task 3 as a separate regression commit
- **Files modified:** `src/services/ingestion-review.ts`, `src/api/*`, `src/storage/repositories/ingestion-session-repository.ts`
- **Verification:** `npm run typecheck`, targeted vitest runs, and `npm run test:ingestion`
- **Committed in:** `39f177b`

---

**Total deviations:** 1 auto-fixed
**Impact on plan:** No scope creep. The implementation still matches the planned behavior and verification surface.

## Issues Encountered
Two new tests initially expected `normalizedPayload` to keep the pre-correction aliases, but the repository correctly re-normalized from `correctedPayload`. The assertions were updated to match the intended contract.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
Phase 05 now has the full ingestion correction loop and an explicit manual-check boundary.
The phase is ready for human/UAT validation against the new API flow, then security and validation follow-up.

## Self-Check: PASSED

---
*Phase: 05-natural-language-ingestion-and-review-api*
*Completed: 2026-04-10*
