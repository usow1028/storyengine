---
phase: 10-incremental-extraction-and-review-resilience
plan: 02
subsystem: review
tags: [ingestion, approval, provenance, check, vitest]
requires:
  - phase: 10-incremental-extraction-and-review-resilience
    provides: retry lineage, stale metadata, and selected extraction reset semantics
provides:
  - material-change approval demotion scoped to the changed segment only
  - unchanged approved-segment reapproval no-op behavior
  - full-session `/check` gating on every segment being approved and current
affects: [phase-10-03, ingestion-review, ingestion-check, provenance]
tech-stack:
  added: []
  patterns:
    - approval demotion happens in the same transaction as the material edit
    - manual checks enforce per-segment currentness, not just aggregate workflowState
key-files:
  created: []
  modified:
    - src/services/ingestion-review.ts
    - src/services/ingestion-check.ts
    - src/storage/repositories/ingestion-session-repository.ts
    - tests/services/ingestion-review-workflow.test.ts
    - tests/api/ingestion-review-api.test.ts
    - tests/api/check-controls-api.test.ts
key-decisions:
  - "Boundary edits and candidate corrections both count as material changes for approved segments."
  - "Unchanged approved segments short-circuit before canonical promotion to avoid duplicate provenance."
  - "Manual `/check` rejects reopened sessions using explicit segment-level `approved && current` checks."
patterns-established:
  - "ApprovedAt, stale, and staleReason move together when review or retry reopens a segment."
  - "Aggregate approval is insufficient for checks once incremental retry exists; segment currentness must be explicit."
requirements-completed: [REVIEW-01, REVIEW-02, OPER-01]
duration: 5 min
completed: 2026-04-11
---

# Phase 10 Plan 02: Review and Check Guardrails Summary

**Approved segments now reopen only when they materially change, repeated approval is idempotent, and full-session checks stay blocked until every segment is approved and current**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-11T05:49:43Z
- **Completed:** 2026-04-11T05:54:35Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Added regressions for approval-reset retry flow, no-op reapproval, and reopened-session `/check` blocking.
- Demoted approved segments inside the patch transaction only when the changed segment materially changed, while preserving untouched approved siblings.
- Hardened manual checks so reopened, stale, failed, or partially approved sessions cannot run a full-session verdict check.

## Task Commits

Each task was committed atomically:

1. **Task 10-02-01: Add review-reset and full-session check regressions** - `8e2131e` (test)
2. **Task 10-02-02: Implement material-change demotion and idempotent reapproval** - `31ad061` (feat)
3. **Task 10-02-03: Harden manual check gating against reopened or partial sessions** - `ea5c227` (feat)

## Files Created/Modified
- `src/storage/repositories/ingestion-session-repository.ts` - Clears approval and sets stale metadata only for materially changed approved segments, and clears stale flags on reapproval.
- `src/services/ingestion-review.ts` - Returns early for unchanged approved-segment reapproval before promotion/provenance writes.
- `src/services/ingestion-check.ts` - Requires every segment to be approved, non-stale, and current before a manual check can run.
- `tests/services/ingestion-review-workflow.test.ts` - Covers boundary-change demotion and no-op reapproval provenance behavior.
- `tests/api/ingestion-review-api.test.ts` - Covers approved-target retry conflicts and explicit approval-reset reopening.
- `tests/api/check-controls-api.test.ts` - Covers reopened-session `/check` blocking until the reopened segment is reapproved.

## Decisions Made
- Materiality is defined structurally: boundary value changes or any candidate correction reopen an approved segment.
- Repeated approval on an unchanged approved segment is treated as a read, not a write, so provenance stays deduplicated.
- `/check` now prefers the segment-level “approved and current” message over the older aggregate approval message when a reopened segment blocks execution.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Wave 3 can now focus on the multi-segment regression matrix and ingestion gate coverage instead of new review semantics.
- Full-session check behavior is stable enough to lock into the standard `test:ingestion` gate.

---
*Phase: 10-incremental-extraction-and-review-resilience*
*Completed: 2026-04-11*
