---
phase: 10-incremental-extraction-and-review-resilience
plan: 01
subsystem: ingestion
tags: [ingestion, retry, api, postgres, vitest]
requires:
  - phase: 09-draft-container-and-segment-scope-model
    provides: stable segment IDs, draft source refs, and additive draft metadata
provides:
  - selected segment extraction through the existing `/extract` API
  - append-only extraction attempt lineage with failure summaries and progress counters
  - additive retry metadata on ingestion session and segment responses
affects: [phase-10-02, phase-10-03, ingestion-review, ingestion-check]
tech-stack:
  added: []
  patterns:
    - append-only extraction attempts with latest-snapshot candidate replacement on success only
    - additive progress summary and retry metadata on ingestion snapshots
key-files:
  created:
    - src/storage/migrations/0006_incremental_extraction_review_resilience.sql
    - tests/services/incremental-extraction-workflow.test.ts
  modified:
    - src/domain/ingestion.ts
    - src/services/ingestion-session.ts
    - src/storage/repositories/ingestion-session-repository.ts
    - src/api/schemas.ts
    - src/api/routes/ingestion-extract.ts
key-decisions:
  - "Selected retries stay on the existing `/extract` route instead of introducing a second retry endpoint."
  - "Failed retry attempts append lineage and preserve the last successful candidate snapshot."
  - "Extractor payload story and revision IDs are normalized to the session target before persistence."
patterns-established:
  - "Per-segment attempt history lives in SQL rows, not mutable segment JSON."
  - "Operational honesty is additive: workflow state, progressSummary, last-failure metadata, and stale flags all surface together."
requirements-completed: [DRAFT-01, DRAFT-04, REVIEW-02, OPER-01]
duration: 15 min
completed: 2026-04-11
---

# Phase 10 Plan 01: Incremental Extraction Foundation Summary

**Selected extraction now retries only requested segments while preserving attempt lineage, prior successful candidates, and additive retry metadata on the existing ingestion API**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-11T05:34:25Z
- **Completed:** 2026-04-11T05:49:43Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- Added Wave 0 regressions for selected extraction, failed retry lineage, and approval-reset conflict handling.
- Persisted append-only `ingestion_segment_attempts` rows plus per-segment retry, failure, and stale metadata in repository snapshots.
- Extended the existing `/api/ingestion/submissions/:sessionId/extract` surface with `segmentIds`, `allowApprovalReset`, `progressSummary`, and ordered attempt history.

## Task Commits

Each task was committed atomically:

1. **Task 10-01-01: Create Wave 0 targeted extraction and retry-state regressions** - `e051a92` (test)
2. **Task 10-01-02: Add append-only extraction attempts and targeted retry orchestration** - `fcfd584` (feat)
3. **Task 10-01-03: Expose targeted extract inputs and retry metadata through the API** - `791cf8a` (feat)

## Files Created/Modified
- `src/storage/migrations/0006_incremental_extraction_review_resilience.sql` - Adds the attempt ledger and additive retry/stale columns on `ingestion_segments`.
- `src/domain/ingestion.ts` - Defines attempt, progress-summary, stale-reason, and extended segment snapshot contracts.
- `src/services/ingestion-session.ts` - Implements selected extraction, approval-reset conflict gating, per-segment failure capture, and session-target payload normalization.
- `src/storage/repositories/ingestion-session-repository.ts` - Persists attempt rows, preserves prior candidates on failed retries, and computes `progressSummary`.
- `src/api/schemas.ts` - Serializes additive retry metadata without renaming existing response fields.
- `src/api/routes/ingestion-extract.ts` - Wires `segmentIds` and `allowApprovalReset` through the unchanged `/extract` route and maps 404/409 conflicts.
- `tests/services/incremental-extraction-workflow.test.ts` - Covers targeted retry, failed attempt lineage, and approval-reset semantics.
- `tests/storage/ingestion-session-repository.test.ts` - Covers attempt persistence, progressSummary, and failed retry candidate retention.
- `tests/api/ingestion-review-api.test.ts` - Covers selected extract response serialization with attempt history and progress counts.

## Decisions Made
- Kept retry semantics on the existing `/extract` route so clients do not need a second ingestion entry point.
- Modeled retry lineage as append-only rows keyed by `(session_id, segment_id, attempt_number)` while keeping `ingestion_candidates` as the latest successful snapshot.
- Forced extracted payload story/revision IDs to the ingestion session target so approval and later promotion stay internally consistent even when the LLM returns draft-target IDs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Promotion fallback] Approval needed a missing-graph bootstrap path**
- **Found during:** Task 10-01-02 (Add append-only extraction attempts and targeted retry orchestration)
- **Issue:** The new API regression approves a segment against an explicit `storyId`/`revisionId` before any canonical graph exists, which caused approval promotion to throw `Story graph not found`.
- **Fix:** Allowed approval promotion to bootstrap an empty target graph when the target revision does not exist yet.
- **Files modified:** `src/services/ingestion-review.ts`
- **Verification:** `npm exec -- vitest run tests/services/incremental-extraction-workflow.test.ts tests/storage/ingestion-session-repository.test.ts tests/api/ingestion-review-api.test.ts --bail=1`
- **Committed in:** `fcfd584` (part of task commit)

---

**Total deviations:** 1 auto-fixed (approval bootstrap fallback)
**Impact on plan:** No scope creep. The auto-fix was required to make the planned retry metadata flow compatible with first-approval promotion.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Review, correction, approval demotion, and `/check` guardrail work can build directly on persisted attempt lineage and additive progress metadata.
- Phase 10-02 can assume approved-target retries now fail closed unless `allowApprovalReset=true`.

---
*Phase: 10-incremental-extraction-and-review-resilience*
*Completed: 2026-04-11*
