# Architecture Research: v1.1 Draft Scale

## Current Architecture

The current system has clear layers:

- Domain schemas in `src/domain`.
- Storage migrations and repositories in `src/storage`.
- Ingestion services in `src/services/ingestion-*`.
- Deterministic checks and repair logic in `src/engine`.
- Fastify routes in `src/api/routes`.
- Browser inspection in `src/ui`.

v1.1 should preserve this layering. Draft-scale behavior belongs mostly in domain, storage, services, API contracts, and inspection DTO shaping.

## Proposed Shape

### Draft Scope Layer

Add a draft scope model that can represent:

- Document or draft container.
- Revision lineage.
- Chapter or section identity.
- Segment ranges.
- Check scope.
- Diff scope.

This should be a domain-level contract, not route-only request metadata. The checker and inspection layers need the same scope values for traceability.

### Ingestion Extension

Extend the existing ingestion flow rather than replacing it:

- `submitIngestionSession` should create a deterministic draft segment plan with document/revision metadata.
- `extractIngestionSession` should allow selected segment extraction and persist segment-level errors.
- `approveReviewedSegment` should keep promotion idempotent and provenance-preserving.
- Session state should distinguish submitted, extracting, partially extracted, needs review, partially approved, approved, checked, and failed segments.

### Check Execution

`executeIngestionCheck` currently requires the full session to be approved. v1.1 should add scoped checks:

- Approved full draft.
- Approved chapter.
- Approved segment range.
- Revision comparison.

The check runner should still receive a canonical `storyId` and `revisionId`, but the run record and inspection snapshot need scope metadata so output cannot be misread.

### Revision Diff

Existing `diffAgainstPreviousRun` fingerprints findings by checker, reason code, category, and evidence IDs. v1.1 should add:

- Revision pair metadata.
- Scope identity.
- Source segment labels.
- Changed canonical entities/events/rules when available.

The first implementation can compare verdict runs, then layer revision-aware labels on top.

### Inspection

The inspection payload should support larger runs by adding:

- Scope summary.
- Segment/chapter grouping.
- Review-state summary.
- Filterable counts by verdict kind, entity, rule, and segment.
- Source span references for each verdict detail.

The UI should remain a browser inspection console, not a visualization-heavy editor.

## Phase Candidates

1. Draft container and segment-scope model.
2. Incremental extraction and review resilience.
3. Scoped checks and revision diff.
4. Large-run inspection and operational guardrails.

## Integration Points

- `src/domain/ingestion.ts`: extend session, segment, and workflow schemas.
- `src/domain/inspection.ts`: add scope and source-span fields.
- `src/storage/migrations`: add draft/revision/scope/job metadata.
- `src/storage/repositories/ingestion-session-repository.ts`: persist new metadata and segment states.
- `src/services/ingestion-session.ts`: segment planning, selected extraction, retry state.
- `src/services/ingestion-check.ts`: scoped check validation and run metadata.
- `src/services/verdict-diff.ts`: revision-aware diff labels.
- `src/api/schemas.ts` and route files: expose stable request/response contracts.
- `src/ui/components`: add filters and scope summaries only after API shape is stable.

## Architectural Constraints

- Deterministic verdicts remain logic-led.
- LLM extraction output must pass Zod validation before promotion.
- Partial approval cannot silently modify unapproved canonical graph state.
- Inspection output must redact raw storage-only fields and expose explicit trace fields.
- Soft-prior advisory output must remain separate from hard verdict truth.
