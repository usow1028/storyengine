# Phase 9: Draft Container and Segment Scope Model - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-04-10T20:43:06+09:00
**Phase:** 09-Draft Container and Segment Scope Model
**Areas discussed:** Draft hierarchy, Segment identity and segmentation, Scope contract, API compatibility

---

## Interaction Mode

`request_user_input` is unavailable in the current Codex mode. Per the skill adapter fallback, the discussion proceeded with recommended defaults and recorded them explicitly for downstream review.

## Draft Hierarchy

| Option | Description | Selected |
|--------|-------------|----------|
| Document -> revision -> chapter/section -> segment | Adds enough hierarchy for chapter-scale drafts while staying close to existing story/revision/segment patterns | yes |
| Session + segments only | Minimal change, but keeps draft-scale identity overloaded into `draftTitle` and `rawText` | |
| Full manuscript ontology | Richer future model, but too broad for Phase 9 and risks format-pack scope creep | |

**User's choice:** Recommended default selected.
**Notes:** Phase 9 should add source organization, not a second canonical narrative model.

---

## Segment Identity and Segmentation

| Option | Description | Selected |
|--------|-------------|----------|
| Deterministic heading/block segmentation with sentence fallback | Reuses current behavior and adds stable source metadata for larger drafts | yes |
| LLM-driven semantic segmentation | Could be smarter, but would add nondeterminism before source contracts are stable | |
| Content-hash identity | Stable for identical text, but brittle when edits change text and undermine revision traceability | |

**User's choice:** Recommended default selected.
**Notes:** Segment boundaries remain review-editable. Cross-revision segment matching is prepared through metadata but implemented later.

---

## Scope Contract

| Option | Description | Selected |
|--------|-------------|----------|
| First-class full draft/chapter/segment-range scope | Gives Phase 11 a clear approved-scope execution contract without implementing execution now | yes |
| Infer scope from currently approved segments | Simpler now, but ambiguous and hard to explain in diff/inspection output | |
| Arbitrary entity/rule/query scopes | Powerful but outside Phase 9 and likely its own later capability | |

**User's choice:** Recommended default selected.
**Notes:** Scope must be explicit in contracts and carry enough identity for later verdict output to state what was checked.

---

## API Compatibility

| Option | Description | Selected |
|--------|-------------|----------|
| Additive extension to current submit/read contracts | Keeps `chunk`, `full_draft`, and existing tests valid while adding draft metadata | yes |
| Breaking rename around a new draft API | Cleaner conceptually, but disrupts Phase 5 verified behavior | |
| Separate draft API with no ingestion compatibility | Avoids old contract complexity, but duplicates review/check flow too early | |

**User's choice:** Recommended default selected.
**Notes:** Preserve the existing mental model: `submit -> extract -> review -> approve -> check`.

---

## the agent's Discretion

- Exact TypeScript and SQL names for new draft/scope records.
- Exact ID formatting and migration split.
- Exact shape of source text reference objects.
- Whether chapter and section are separate fields or one generic level in Phase 9.

## Deferred Ideas

- Selected-segment extraction, retry, and failure reporting - Phase 10.
- Scoped check execution and revision diffs - Phase 11.
- Large-run inspection UI grouping/filtering - Phase 12.
- Collaboration, export, realtime editor checks, autonomous rewrites, style scoring - future milestones or out of scope.
