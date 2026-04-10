# Research Summary: v1.1 Draft Scale

## Decision

v1.1 should prioritize Draft Scale: chapter-scale/full-draft ingestion, incremental review, scoped checks, revision diff, and larger-run inspection.

This is the right next milestone because v1.0 already proved the core consistency engine and review loop. The next valuable risk is whether that loop survives larger author input while preserving explainability.

## Recommended Scope

- Draft/chapter container and revision metadata.
- Deterministic segment planning with stable labels and offsets.
- Segment-level extraction, retry, review, correction, and approval.
- Explicit check scope for approved draft ranges.
- Revision/run diff with scope-aware labels.
- Inspection grouping and filtering for larger verdict sets.
- Operational guardrails for partial failure and unresolved review state.

## Recommended Non-Scope

- Multi-user collaboration.
- Export or format packs.
- Real-time editor integration.
- Autonomous rewrite generation.
- Style scoring.
- Heavy graph visualization.
- New runtime infrastructure or queue dependency.

## Implementation Sequence

1. Extend domain and storage with draft containers, revisions, segment hierarchy, scope, and job/review status.
2. Make ingestion extract/review/approval robust across many segments.
3. Add scoped check execution and revision-aware diff output.
4. Update inspection API/UI for grouping, filtering, scope summaries, and provenance.

## Key Constraints

- Verdict truth stays deterministic and logic-led.
- LLM output remains reviewed and Zod-validated before canonical promotion.
- Partial approvals must be explicit.
- Every finding must remain traceable to canonical IDs and original source spans.
- Soft priors remain advisory only.

## Roadmap Implication

The next phase should be Phase 09, not Phase 01, because v1.0 phases 1-8 are complete and archived. A four-phase v1.1 plan is sufficient:

- Phase 09: Draft container and segment scope model.
- Phase 10: Incremental extraction and review resilience.
- Phase 11: Scoped checks and revision diff.
- Phase 12: Large-run inspection and operational guardrails.
