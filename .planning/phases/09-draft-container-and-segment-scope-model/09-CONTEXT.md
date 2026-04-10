# Phase 9: Draft Container and Segment Scope Model - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 9 establishes the draft-scale model that lets chapter-sized input remain ordered, scoped, and traceable. It covers document/revision/chapter/segment identity, source-span preserving segment metadata, and first-class scope contracts that later phases can use for extraction retries, approved-scope checks, revision diffs, and inspection grouping.

This phase does not implement selected-segment extraction, retry behavior, check execution over scope, revision-diff calculation, browser UI grouping, collaboration, export, or realtime editor behavior. Those belong to later v1.1 phases or future milestones.

</domain>

<decisions>
## Implementation Decisions

### Draft Hierarchy
- **D-01:** Model draft-scale input as `draft document -> draft revision -> chapter/section -> segment`. `document` and `revision` are required concepts; `chapter/section` and `segment` provide ordered navigation and traceability.
- **D-02:** A draft document is the stable writer-facing container for a longer work or chapter set. A draft revision is the versioned analysis target and should connect cleanly to existing `storyId` and `revisionId` semantics.
- **D-03:** Chapter/section metadata should be lightweight in Phase 9. It needs stable labels/order and source ranges, but not a full manuscript outline, scene graph, or format-specific structure.
- **D-04:** Keep existing canonical story entities/events/rules as the reasoning model. Draft hierarchy is source organization and provenance context, not a second narrative truth model.

### Segment Identity and Segmentation
- **D-05:** Use deterministic segmentation first: explicit headings and blank-line blocks should create primary segments, with the existing sentence-window fallback for single-block draft text.
- **D-06:** Segment boundaries stay review-editable, carrying forward Phase 5. Phase 9 should preserve boundary patch compatibility while adding richer source context.
- **D-07:** Segment identity should not depend only on raw text content hashes. Prefer stable path/order metadata such as document, revision, chapter key, sequence, and offsets so edits do not destroy traceability.
- **D-08:** Cross-revision segment matching is not required to be solved fully in Phase 9. Phase 9 should store enough metadata for Phase 11 to compare revisions, but the diff algorithm itself belongs to Phase 11.

### Scope Contract
- **D-09:** Define check scope as a first-class domain contract in Phase 9 even though scope execution is Phase 11.
- **D-10:** Supported initial scope forms are full approved draft, chapter/section, and contiguous segment range. Avoid arbitrary entity/rule/query scopes in Phase 9.
- **D-11:** Scope records must carry enough identity for downstream results to state what was checked: document, revision, optional chapter/section, segment range, and source offsets where available.
- **D-12:** Scope should be explicit in API/service contracts instead of inferred from whatever segments currently happen to be approved.

### API Compatibility
- **D-13:** Preserve the existing `chunk` and `full_draft` submission modes and the current `submit -> extract -> review -> approve -> check` mental model.
- **D-14:** Add draft metadata as extensions to current request/response contracts rather than renaming existing fields in a breaking way.
- **D-15:** `draftTitle` and `rawText` can remain compatibility fields, but they must no longer be the only place draft-scale identity lives.
- **D-16:** Existing ingestion tests for session snapshots, segmentation, review patches, and API serialization should remain valid while new draft-scale fields are added.

### the agent's Discretion
- Exact TypeScript names for draft document, draft revision, chapter/section, segment path, and scope schemas.
- Whether chapter and section use one enum-backed structure or a generic hierarchy node in Phase 9, provided the first supported level is chapter/section plus segments.
- Exact ID formatting, as long as IDs are Zod-validated, deterministic where practical, and preserve backward compatibility.
- Exact migration layout, as long as it keeps pg-mem storage tests fast and queryable.
- Whether source text references are stored as inline fields or a small structured object, as long as labels, order, offsets, and text linkage are preserved.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and Phase Contracts
- `.planning/PROJECT.md` - v1.1 Draft Scale goal, core value, explainability constraints, and hard/soft separation requirements.
- `.planning/REQUIREMENTS.md` - v1.1 requirements `DRAFT-01`, `DRAFT-03`, and related later-phase dependencies.
- `.planning/ROADMAP.md` - fixed Phase 9 boundary, success criteria, and three planned work slices.
- `.planning/STATE.md` - current active phase and next workflow state.
- `.planning/research/SUMMARY.md` - v1.1 sequence and non-scope.
- `.planning/research/STACK.md` - decision to stay on the existing TypeScript/Fastify/Zod/pg-mem stack with no new runtime dependency for Phase 9.
- `.planning/research/ARCHITECTURE.md` - draft scope layer, ingestion extension, and integration point guidance.

### Prior Phase Decisions
- `.planning/milestones/v1.0-phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md` - locked submit/extract/review/approve/check flow, full-draft segmentation, structured review, segment-level approval, and provenance expectations.
- `.planning/milestones/v1.0-phases/07-soft-prior-runtime-integration/07-CONTEXT.md` - hard verdict truth and soft-prior advisory separation that draft-scale contracts must preserve.
- `.planning/milestones/v1.0-phases/08-interactive-inspection-surface/08-CONTEXT.md` - inspection traceability and grouped verdict output that later v1.1 phases will extend.

### Code Surfaces
- `src/domain/ingestion.ts` - current ingestion session, segment, candidate, review patch, and workflow-state schemas.
- `src/services/ingestion-session.ts` - current deterministic segmentation, draft target creation, extraction batch creation, and candidate normalization.
- `src/storage/migrations/0003_ingestion_review.sql` - current ingestion session/segment/candidate persistence schema to extend.
- `src/storage/repositories/ingestion-session-repository.ts` - current repository parsing, workflow-state computation, and segment/candidate persistence.
- `src/api/schemas.ts` - current request/response schemas for submission, extraction, review, check, and inspection response exports.
- `src/domain/ids.ts` - existing ID schema pattern to follow for new draft and scope IDs.
- `src/domain/inspection.ts` - current inspection DTOs that later phases will extend with scope/source-span metadata.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SubmissionInputKindSchema` already supports `chunk` and `full_draft`; Phase 9 should extend around it instead of replacing it.
- `IngestionSessionRecordSchema`, `IngestionSegmentRecordSchema`, and `IngestionCandidateRecordSchema` already preserve session, segment sequence, labels, offsets, source spans, provenance detail, extracted payload, corrected payload, and normalized payload.
- `segmentSubmissionText` already performs heading/block/sentence-window segmentation and can be evolved into a richer draft segment planner.
- `IngestionSessionRepository` already has pg-mem-compatible SQL persistence and snapshot reconstruction for sessions, segments, and candidates.
- `serializeIngestionSessionResponse` already centralizes API serialization, making it the right boundary for adding draft metadata without exposing raw storage rows.

### Established Patterns
- Zod schemas in `src/domain` and `src/api/schemas.ts` define the runtime contract and inferred TypeScript types.
- Storage changes are expressed as SQL migrations plus repository parsing tests.
- Services in `src/services` orchestrate domain and repository behavior; they should remain the place where draft segment planning is applied.
- Prior phases favor additive response evolution and explicit compatibility over breaking route contract changes.
- Verdict truth, repair ranking, and soft-prior advisory output are separate concerns and should not be pulled into Phase 9 data modeling.

### Integration Points
- Add draft document/revision/chapter/segment scope schemas in or near `src/domain/ingestion.ts`, or a new domain file exported through `src/domain/index.ts`.
- Extend ingestion migrations and repository row parsing for document/revision/chapter/segment metadata.
- Extend submit/read API schemas so callers can send and receive draft-scale metadata while old chunk/full-draft calls still parse.
- Add or update tests around `segmentSubmissionText`, ingestion repository round trips, API serialization, and backward compatibility.

</code_context>

<specifics>
## Specific Ideas

- Phase 9 should make long input understandable as an ordered source structure before it tries to process more of it.
- Keep the model practical: document, revision, chapter/section, segment, scope. Do not introduce a full manuscript-format ontology yet.
- The default implementation should be conservative and schema-led. It should prepare later phases without sneaking later-phase behavior into Phase 9.
- Prior soft-prior memory confirms the hard verdict must stay unchanged while advisory layers only annotate or rerank. Phase 9 schemas should preserve that boundary by keeping draft scope separate from verdict truth.

</specifics>

<deferred>
## Deferred Ideas

- Selected-segment extraction, retry, and failure reporting - Phase 10.
- Partial approval check semantics and explicit approved-scope execution - Phase 11.
- Revision-diff calculation and cross-revision segment matching algorithms - Phase 11.
- Browser inspection grouping/filtering for large runs - Phase 12.
- Multi-user collaboration, export/format packs, realtime editor checks, autonomous rewrites, and style scoring - out of v1.1 scope.

</deferred>

---

*Phase: 09-draft-container-and-segment-scope-model*
*Context gathered: 2026-04-10*
