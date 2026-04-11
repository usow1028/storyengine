# Phase 10: Incremental Extraction and Review Resilience - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 10 makes draft extraction and review safe across many segments inside a single draft revision. It covers selected-segment extraction, retry behavior, per-segment failure and staleness state, and review/promotion guardrails that preserve canonical correctness when only part of a draft is ready.

This phase does not add approved-scope check execution, revision diffing, large-run inspection grouping, collaboration, or background queue infrastructure. Those remain Phase 11, Phase 12, or later work.

</domain>

<decisions>
## Implementation Decisions

### Extraction Targeting and Retry
- **D-01:** Selected extraction and retry should target explicit `segmentId[]` values. Whole-session extraction remains the default when no selection is provided, but partial reruns use concrete segment IDs rather than fuzzy text filters or chapter-scope shortcuts.
- **D-02:** Retrying extraction must replace extraction results only for the targeted segments. Untargeted segments, especially already-approved ones, must remain untouched.
- **D-03:** Each segment should persist attempt-oriented metadata needed for resilient review: attempt count, last extraction timestamp, last failure reason or error summary, and whether the latest extraction is stale or current.

### Review State and Staleness
- **D-04:** Any boundary edit or extraction retry that changes a segment after review must mark only that segment stale or review-required. The whole session should not be reset if unaffected segments remain valid.
- **D-05:** Approved segments are not silently mutable. If an approved segment is retried or materially edited, its approval must be cleared and it must be re-approved explicitly before contributing to a fully approved session again.
- **D-06:** Session state should aggregate mixed segment outcomes honestly. Phase 10 should support explicit partial-extraction and partial-approval semantics instead of collapsing everything into a single optimistic session state.

### Approval and Promotion Guardrails
- **D-07:** Segment approval remains segment-scoped and idempotent. Re-approving an unchanged approved segment must not duplicate canonical promotion or provenance writes.
- **D-08:** Canonical promotion still happens only for approved segments. Partial approval is allowed, but the existing full-session `/check` gate must remain blocked until Phase 11 adds explicit approved-scope checks.
- **D-09:** Retry and correction flows must preserve provenance lineage per segment: extracted payload, corrected payload, source spans, and retry history remain auditable.

### API and Operational Shape
- **D-10:** Keep the Phase 5 mental model `submit -> extract -> review -> approve -> check`, but extend the extract and read responses with additive per-segment retry, error, and staleness fields.
- **D-11:** Keep Phase 10 request-driven in the current Fastify plus service plus repository architecture. Do not introduce background workers or queue-only lifecycle management in this phase.
- **D-12:** Selected extraction should extend the existing extract route and schemas rather than introducing a separate draft-processing workflow surface.

### the agent's Discretion
- Exact naming for new workflow states and per-segment retry or stale metadata, as long as they stay additive and explicit.
- Whether targeted extraction accepts only `segmentId[]` or internally supports section or range expansion, as long as `segmentId` remains the stable public selection unit in Phase 10.
- Exact HTTP conflict semantics for retrying approved or stale segments, as long as the implementation prevents silent overwrite of approved state.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and Phase Contracts
- `.planning/PROJECT.md` - v1.1 draft-scale goal, explainability constraints, and the requirement that larger-draft workflows stay logic-led and auditable.
- `.planning/REQUIREMENTS.md` - Phase 10 requirement set `DRAFT-01`, `DRAFT-04`, `REVIEW-01`, `REVIEW-02`, and `OPER-01`.
- `.planning/ROADMAP.md` - fixed Phase 10 scope, success criteria, and plan breakdown.
- `.planning/STATE.md` - current workflow handoff and cross-phase decisions.
- `.planning/research/SUMMARY.md` - milestone sequence and the recommendation to make extraction and review robust before scoped checks.
- `.planning/research/ARCHITECTURE.md` - v1.1 ingestion-extension guidance, especially selected extraction, segment-level errors, and partial-approval handling.

### Prior Phase Decisions
- `.planning/milestones/v1.0-phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md` - locked submit/extract/review/approve/check workflow, segment-level approval, and provenance expectations.
- `.planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md` - draft document, revision, section, segment, and scope modeling that Phase 10 builds on.
- `.planning/milestones/v1.0-phases/07-soft-prior-runtime-integration/07-CONTEXT.md` - hard-verdict truth and advisory-only boundaries that review retries must not blur.

### Code Surfaces
- `src/services/ingestion-session.ts` - current whole-session extract flow, deterministic segment planning, and extraction candidate normalization.
- `src/services/ingestion-review.ts` - current patch and approval flow, canonical promotion, and provenance recording.
- `src/services/ingestion-check.ts` - current full-session approval gate that Phase 10 must preserve until Phase 11 adds approved-scope checks.
- `src/storage/repositories/ingestion-session-repository.ts` - workflow-state aggregation, segment patching, approval persistence, and snapshot reconstruction.
- `src/api/routes/ingestion-extract.ts` - current extract route surface to extend for selected-segment extraction.
- `src/api/routes/ingestion-review.ts` - current patch and approve route behavior that Phase 10 guardrails must harden.
- `src/api/schemas.ts` - additive request and response schemas for ingestion session serialization.
- `tests/services/ingestion-review-workflow.test.ts` - promotion and provenance expectations for partially approved sessions.
- `tests/api/ingestion-review-api.test.ts` - public API baseline for submit, extract, patch, approve, and read flows.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `planDraftSubmission` and Phase 09 draft metadata already give every segment stable `segmentId`, `draftPath`, and `sourceTextRef` values for targeted retry behavior.
- `extractIngestionSession` already builds a `StructuredExtractionBatch` and writes per-segment candidate results; this is the natural place to add selected extraction and retry metadata.
- `IngestionSessionRepository` already recalculates aggregate workflow state from per-segment state, which Phase 10 can extend with partial-extraction and stale-state rules.
- `applyReviewPatch` and `approveReviewedSegment` already enforce review-before-approval and provenance-backed promotion, so Phase 10 should strengthen those guardrails rather than replace the flow.

### Established Patterns
- Domain and API contracts are Zod-first and evolve additively.
- Storage changes are done through SQL migrations plus pg-mem repository and API tests.
- Fastify routes are thin wrappers around service-layer orchestration.
- The project favors explicit compatibility and visible state transitions over implicit background behavior.

### Integration Points
- Extend `src/domain/ingestion.ts` and related response schemas with targeted extraction, retry, failure, and staleness metadata.
- Extend `src/services/ingestion-session.ts` to accept selected segments, persist retry outcomes, and protect untouched segments.
- Harden `src/services/ingestion-review.ts` and repository patch or approve behavior so approved segments demote safely when retried or materially edited.
- Extend repository migration and snapshot loading so per-segment retry state and aggregate partial status survive round trips.
- Add lifecycle coverage in API and service tests for mixed extracted, failed, stale, partially approved, and re-approved segment flows.

</code_context>

<specifics>
## Specific Ideas

- Preserve the existing manual loop and draft hierarchy. Phase 10 should make larger drafts survivable without inventing a second ingestion workflow.
- Mixed outcomes must stay visible. A single failed or stale segment should not be hidden by neighboring approved segments.
- Reapproval after a material change should be explicit. Silent continued approval is too risky for canonical correctness.
- No specific product-style references were provided; standard, conservative service and API patterns are acceptable here.

</specifics>

<deferred>
## Deferred Ideas

- Approved-scope check execution and richer scope selectors beyond explicit segment targeting - Phase 11.
- Revision-to-revision diffing and cross-revision retry reconciliation - Phase 11.
- Inspection grouping, filtering, and large-run UI affordances - Phase 12.
- Background queue or worker orchestration for extraction retries - future work if request-driven lifecycle proves insufficient.
- Multi-user review locking or collaboration semantics - future milestone.

</deferred>

---

*Phase: 10-incremental-extraction-and-review-resilience*
*Context gathered: 2026-04-11*
