---
phase: 09-draft-container-and-segment-scope-model
plan: 01
subsystem: domain
tags: [zod, ingestion, drafts, segmentation]
requires:
  - phase: 05-natural-language-ingestion-and-review-api
    provides: deterministic ingestion segmentation and review-session contracts
provides:
  - LF-normalized draft document, revision, section, scope, and source-ref schemas
  - Deterministic draft submission planning with section-aware segment metadata
  - Backward-compatible `segmentSubmissionText` delegation for `chunk` and `full_draft`
affects: [phase-09-02, phase-09-03, draft-scale-ingestion]
tech-stack:
  added: []
  patterns:
    - LF-normalized source offsets
    - lightweight chapter/section contracts
    - planner-backed segmentation compatibility
key-files:
  created:
    - src/domain/drafts.ts
    - tests/domain/drafts.test.ts
  modified:
    - src/domain/index.ts
    - src/domain/ingestion.ts
    - src/services/ingestion-session.ts
    - src/storage/repositories/ingestion-session-repository.ts
    - tests/services/natural-language-extraction.test.ts
key-decisions:
  - "Use LF-normalized raw text as the canonical offset basis for draft source refs."
  - "Model chapter and section with one lightweight `DraftSection` schema keyed by `sectionKind`."
  - "Preserve legacy callers by routing `segmentSubmissionText` through `planDraftSubmission`."
patterns-established:
  - "Draft metadata is additive: ingestion records gain nullable draft fields instead of replacing the existing session model."
  - "Schema cycles resolve through lazy Zod bindings rather than duplicating domain contracts."
requirements-completed: [DRAFT-01, DRAFT-03]
duration: 4 min
completed: 2026-04-11
---

# Phase 09 Plan 01: Draft Domain and Segmentation Contracts Summary

**LF-normalized draft document and section contracts now drive deterministic segment planning while keeping the legacy ingestion segmentation API stable**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-11T03:34:14Z
- **Completed:** 2026-04-11T03:38:59Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Added `src/domain/drafts.ts` with explicit document, revision, section, source-ref, path, and scope schemas for draft-scale ingestion.
- Extended ingestion domain records with nullable draft metadata so new draft-aware planning can coexist with existing session and segment parsing.
- Added `planDraftSubmission()` and `normalizeDraftSourceText()` so full-draft inputs produce deterministic LF-based offsets, section labels, and source references without breaking `chunk` mode.

## Task Commits

Each task was committed atomically:

1. **Task 09-01-00: Create Wave 0 draft domain and segmentation tests** - `46e07c8` (test)
2. **Task 09-01-01: Add draft and scope Zod contracts** - `9053eaa` (feat)
3. **Task 09-01-02: Implement LF-normalized deterministic draft planning** - `23d9046` (feat)

## Files Created/Modified
- `src/domain/drafts.ts` - Draft document, revision, section, source-ref, path, and scope schemas plus submission plan parsing.
- `src/domain/ingestion.ts` - Nullable draft metadata on ingestion sessions, segments, and snapshots.
- `src/domain/index.ts` - Draft schema exports available to downstream layers.
- `src/services/ingestion-session.ts` - LF normalization and planner-backed segment generation.
- `src/storage/repositories/ingestion-session-repository.ts` - `createSession()` widened to schema input types so existing callers remain compatible with new defaulted draft fields.
- `tests/domain/drafts.test.ts` - Wave 0 coverage for source refs and supported scope kinds.
- `tests/services/natural-language-extraction.test.ts` - Draft planner and CRLF offset regressions while preserving chunk compatibility.

## Decisions Made
- Used LF normalization as the only offset basis so stored source references and later slices stay reproducible across CRLF and lone-CR inputs.
- Kept chapter and section in one flat `DraftSection` model instead of inventing a deeper hierarchy before later phases need it.
- Kept the existing `segmentSubmissionText()` surface by delegating to the richer planner rather than branching two parallel segmentation implementations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Type-compatibility] Repository input widened after adding defaulted draft fields**
- **Found during:** Task 09-01-01 (Add draft and scope Zod contracts)
- **Issue:** `IngestionSessionRecordSchema` gained defaulted draft fields, which made existing `createSession()` callers fail typecheck even though runtime parsing remained valid.
- **Fix:** Updated `IngestionSessionRepository.createSession()` to accept the schema input type and continue parsing internally.
- **Files modified:** `src/storage/repositories/ingestion-session-repository.ts`
- **Verification:** `npm run typecheck`
- **Committed in:** `9053eaa` (part of task commit)

---

**Total deviations:** 1 auto-fixed (type compatibility)
**Impact on plan:** No scope creep. The auto-fix preserved existing call sites after the new draft defaults were introduced.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Draft-scale contracts and deterministic planning are ready for additive SQL persistence in `09-02`.
- Storage work can assume LF-normalized segment offsets and explicit scope metadata without changing hard verdict behavior.

---
*Phase: 09-draft-container-and-segment-scope-model*
*Completed: 2026-04-11*
