# Phase 5: Natural-Language Ingestion and Review API - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase adds the natural-language intake and review layer in front of the existing StoryGraph consistency engine. It covers submitting prose-like scene chunks or full drafts, extracting structured interpretation candidates, reviewing and approving those candidates before canonical promotion, and exposing an API flow that lets the user trigger consistency checks on demand. It does not yet add autonomous correction, multi-model extraction orchestration, or a rich visual inspection UI.

</domain>

<decisions>
## Implementation Decisions

### Submission Model and Segmentation
- **D-01:** The intake API supports both `scene/synopsis chunk` submissions and `full story draft` submissions.
- **D-02:** Full story drafts are automatically segmented into reviewable scene/segment units before review.
- **D-03:** A submission may either target an existing `storyId/revisionId` or start a new draft session.
- **D-04:** Automatic segment boundaries remain user-editable during review.

### Review Surface and Canonical Promotion
- **D-05:** Review is performed through structured field editing, not free-text annotation-first correction.
- **D-06:** Approval happens at the scene/segment level.
- **D-07:** Only approved segments are promoted into canonical revision state; unapproved segments remain pending review.
- **D-08:** Even for full-draft intake, review stays chunk-oriented rather than forcing all-at-once approval.

### API Flow and State Model
- **D-09:** The baseline API flow is `submit -> extract -> review -> approve -> check`.
- **D-10:** Consistency checks run only when the user explicitly requests them.
- **D-11:** The external workflow uses an explicit state machine with states such as `submitted`, `extracted`, `needs_review`, `partially_approved`, `approved`, and `checked`.
- **D-12:** Review and check remain separate API responsibilities; extraction completion does not imply automatic checking.

### Ambiguity, Provenance, and Auditability
- **D-13:** Ambiguous interpretation outputs remain visible as structured candidates with fields such as `confidence`, `provenance`, and `review_needed`.
- **D-14:** Every structured item carries source-text span or segment-level provenance, not only submission-level provenance.
- **D-15:** The system preserves both the original extracted value and the user-corrected value for auditability.
- **D-16:** `review_needed` is assigned automatically when confidence is low or multiple candidate interpretations conflict.

### Extraction Boundary and Failure Handling
- **D-17:** Extraction is LLM-assisted, but progression depends on deterministic schema validation and canonical normalization.
- **D-18:** If an LLM output parses but cannot be normalized cleanly, it moves to `review_needed` rather than being auto-fixed or silently promoted.
- **D-19:** Phase 5 starts with a single model and a single prompt family; multi-model or multi-pass extraction is deferred.
- **D-20:** The extraction layer is advisory only and never bypasses the logic-led canonical model.

### the agent's Discretion
- Exact segmentation heuristics for auto-splitting full drafts, as long as segment boundaries remain review-editable.
- Exact review payload and patch format, as long as structured field editing and segment-level approval remain intact.
- Exact persistence model for in-progress review state, as long as canonical promotion stays approval-gated and auditable.
- Exact confidence threshold policy that turns candidates into `review_needed`.
- Exact API route naming and transport surface, as long as the chosen state machine and manual check trigger are preserved.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and Phase Contracts
- `.planning/PROJECT.md` — project philosophy, explainability requirement, and the rule that natural language remains an input layer over structured internal state
- `.planning/REQUIREMENTS.md` — Phase 5 requirements `FLOW-01` and `FLOW-03`, plus the broader logic-led consistency requirements that ingestion must not violate
- `.planning/ROADMAP.md` — fixed Phase 5 boundary, success criteria, and plan breakdown
- `.planning/STATE.md` — current phase progression and accumulated cross-phase decisions

### Upstream Phase Decisions
- `.planning/phases/01-canonical-narrative-schema/01-CONTEXT.md` — canonical entity/event/state/rule model that extracted interpretation must normalize into
- `.planning/phases/02-hard-constraint-engine/02-CONTEXT.md` — deterministic rule-engine boundaries and hard-verdict semantics that the API must not blur
- `.planning/phases/03-evidence-and-repair-reasoning/03-CONTEXT.md` — evidence, repair, and rerun expectations that approved ingestion output will later feed
- `.planning/phases/04-corpus-priors-and-soft-pattern-layer/04-CONTEXT.md` — soft-prior separation rules that keep extraction and review distinct from hard/soft judgment
- `.planning/phases/04-corpus-priors-and-soft-pattern-layer/04-SECURITY.md` — current threat posture around provenance, explainability, and reviewable audit trails
- `.planning/phases/04-corpus-priors-and-soft-pattern-layer/04-VALIDATION.md` — current automation conventions that Phase 5 validation should extend

### Stack and Workflow Contracts
- `AGENTS.md` — stack guidance, GSD workflow entry rules, and project-level tooling constraints relevant to introducing the first API surface

### Scope Notes
- No external ADR or feature-spec documents exist yet beyond the planning artifacts above; Phase 5 requirements are anchored in the project, roadmap, and prior phase context files.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/storage/repositories/story-repository.ts` — canonical story/revision persistence boundary that approved ingestion output should feed rather than bypass
- `src/services/verdict-runner.ts` — manual verdict-run orchestration entrypoint that the Phase 5 `check` step should call after approval
- `src/services/explained-verdicts.ts` — existing service-layer pattern for deterministic structured outputs built from engine data
- `src/domain/*.ts` and `src/engine/types.ts` — Zod-backed canonical contracts that extracted interpretation must satisfy before promotion
- `src/storage/repositories/verdict-repository.ts` and `src/storage/repositories/verdict-run-repository.ts` — existing audit-friendly verdict persistence boundaries that Phase 5 should integrate with instead of replacing

### Established Patterns
- Runtime boundaries validate with Zod and inferred TypeScript types from the same source modules.
- Orchestration lives in `src/services`, while persistence boundaries live in `src/storage/repositories`.
- Deterministic judgment is already isolated from upstream input handling, and Phase 5 should preserve that layering.
- The workspace currently has no HTTP/API framework or routing layer installed, so Phase 5 must introduce an API surface without breaking the existing service-first structure.

### Integration Points
- Extraction/review services should emit canonical entity/event/state/rule candidates compatible with `StoryRepository` inputs.
- Segment approval should map review patches into revision-scoped canonical updates instead of writing directly to final verdict or prior artifacts.
- Manual `check` calls should route through `executeVerdictRun` rather than duplicating engine orchestration.
- Provenance and user-edited overlays will likely need a review-session persistence layer adjacent to existing story/revision records.

</code_context>

<specifics>
## Specific Ideas

- The user wants both chunk-first intake and full-draft intake, but even full drafts must become reviewable chunks rather than opaque one-shot ingestion.
- Review must remain structured and inspectable instead of relying on free-text correction loops.
- Consistency checking stays a deliberate, user-triggered action after review, not an automatic side effect of submission or approval.
- Ambiguous extraction should stay visible with evidence and uncertainty markers rather than being silently flattened into canonical truth.

</specifics>

<deferred>
## Deferred Ideas

- Automatic checks on approval or on submission — deferred because Phase 5 keeps checks manual and user-triggered.
- Free-text annotation driven correction loops — deferred in favor of structured field editing.
- Multi-model or multi-pass extraction pipelines — deferred until the single-model contract stabilizes.
- Marking every extracted item as review-required by default — deferred because rule-based `review_needed` was chosen instead.
- Whole-draft all-at-once approval/finalization flows — deferred because segment-level approval was chosen.

</deferred>

---

*Phase: 05-natural-language-ingestion-and-review-api*
*Context gathered: 2026-04-10*
