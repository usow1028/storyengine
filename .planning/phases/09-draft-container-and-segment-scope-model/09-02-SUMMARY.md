---
phase: 09-draft-container-and-segment-scope-model
plan: 02
subsystem: database
tags: [postgres, pg-mem, ingestion, drafts]
requires:
  - phase: 09-01
    provides: draft schemas and deterministic draft submission plans
provides:
  - additive draft document, revision, section, and scope tables
  - repository round trips for draft metadata and scope payloads
  - legacy ingestion snapshot synthesis without destructive backfill
affects: [phase-09-03, phase-10, draft-scale-storage]
tech-stack:
  added: []
  patterns:
    - additive SQL migrations
    - compatibility synthesis for legacy rows
    - JSONB-backed draft metadata on ingestion segments
key-files:
  created:
    - src/storage/migrations/0005_draft_scope.sql
  modified:
    - src/storage/repositories/ingestion-session-repository.ts
    - src/storage/schema.ts
    - tests/storage/ingestion-session-repository.test.ts
key-decisions:
  - "Persist draft metadata additively instead of replacing existing ingestion tables."
  - "Synthesize compatibility draft IDs for legacy rows when draft tables or IDs are absent."
  - "Update `source_text_ref` whenever review boundary edits change segment offsets."
patterns-established:
  - "Repository reads prefer persisted draft tables and only fall back to session-derived compatibility metadata."
  - "Scope payloads are stored as parameterized JSONB objects alongside explicit `scope_kind` columns."
requirements-completed: [DRAFT-01, DRAFT-03]
duration: 3 min
completed: 2026-04-11
---

# Phase 09 Plan 02: Draft Persistence and Scope Storage Summary

**Additive draft tables and enriched ingestion snapshot loading now persist section metadata, scope payloads, and legacy-compatible draft IDs without backfilling existing rows**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-11T03:42:42Z
- **Completed:** 2026-04-11T03:46:28Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added `0005_draft_scope.sql` with draft document, revision, section, and check-scope tables plus nullable draft columns on existing ingestion rows.
- Extended `IngestionSessionRepository` with `saveDraftPlan()`, draft-aware session/segment persistence, scope loading, and legacy fallback synthesis for rows created before Phase 9.
- Proved the new persistence layer through dedicated pg-mem tests and the broader `npm run test:ingestion` gate.

## Task Commits

Each task was committed atomically:

1. **Task 09-02-01: Add storage round-trip and legacy compatibility tests** - `78b9a51` (test)
2. **Task 09-02-02: Add additive draft/scope SQL and repository persistence** - `67b391d` (feat)

## Files Created/Modified
- `src/storage/migrations/0005_draft_scope.sql` - Additive SQL for draft documents, revisions, sections, scopes, and nullable ingestion draft columns.
- `src/storage/schema.ts` - Canonical table inventory updated with the new draft tables.
- `src/storage/repositories/ingestion-session-repository.ts` - Draft plan persistence, compatibility synthesis, enriched segment reads, and boundary-driven `source_text_ref` updates.
- `tests/storage/ingestion-session-repository.test.ts` - Round-trip, legacy, and boundary-sync coverage for Phase 9 storage behavior.

## Decisions Made
- Chose additive migration steps and nullable columns over destructive schema replacement so older ingestion rows continue to load.
- Made `loadSessionSnapshot()` prefer persisted draft tables when present and synthesize draft IDs only for legacy sessions with missing metadata.
- Stored scope payloads as JSONB plus explicit `scope_kind` so future scoped-check logic can query by type without losing full schema fidelity.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- API submit/read routes can now serialize persisted draft sections, scope payloads, and segment source references in `09-03`.
- Legacy chunk and full-draft sessions remain green, so the next wave can focus on request/response contracts instead of storage repair.

---
*Phase: 09-draft-container-and-segment-scope-model*
*Completed: 2026-04-11*
