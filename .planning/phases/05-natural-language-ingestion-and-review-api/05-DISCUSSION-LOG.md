# Phase 5: Natural-Language Ingestion and Review API - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 05-natural-language-ingestion-and-review-api
**Areas discussed:** Submission model and segmentation, Review workflow, API flow and state model, Ambiguity and provenance, Extraction engine boundary

---

## Submission Model and Segmentation

### Q1. Default submission unit

| Option | Description | Selected |
|--------|-------------|----------|
| Scene/synopsis chunk | Submit one scene or short synopsis block at a time | |
| Full story draft | Submit a larger full-draft input as one request | |
| Both | Support both chunk-first and full-draft intake | ✓ |
| Other | User-defined alternative | |

**User's choice:** Support both `scene/synopsis chunk` and `full story draft`
**Notes:** Full-draft support should not remove later review granularity.

### Q2. Review unit for full story drafts

| Option | Description | Selected |
|--------|-------------|----------|
| Server segmentation | Server splits full drafts into reviewable scene/segment units | ✓ |
| Whole-draft review | Review one full extracted interpretation at once | |
| Outline then drill-down | Review a high-level extraction first, then segment drill-down | |
| Other | User-defined alternative | |

**User's choice:** Server splits full drafts into reviewable scene/segment units
**Notes:** Review should happen at manageable units even for large submissions.

### Q3. Submission target model

| Option | Description | Selected |
|--------|-------------|----------|
| Existing story/revision only | Require explicit `storyId` and `revisionId` | |
| New draft only | Every intake starts a new draft session | |
| Both | Support existing target attachment and new draft creation | ✓ |
| Other | User-defined alternative | |

**User's choice:** Support both existing `storyId/revisionId` targets and new draft creation
**Notes:** The intake API should work for continuation and for greenfield drafts.

### Q4. Segment boundary handling

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-split + editable boundaries | Server auto-splits; user can fix boundaries during review | ✓ |
| Auto-split only | Server splits and boundaries are fixed | |
| User-predefined boundaries | User must mark segments before intake | |
| Other | User-defined alternative | |

**User's choice:** Auto-split with review-time boundary editing
**Notes:** Segmentation should accelerate intake but remain corrigible.

---

## Review Workflow

### Q5. Primary correction mode

| Option | Description | Selected |
|--------|-------------|----------|
| Structured field editing | Review and correct entities/events/states/rules directly | ✓ |
| Free-text annotation | Annotate prose and let the system reinterpret it | |
| Both | Support structured editing and annotation correction | |
| Other | User-defined alternative | |

**User's choice:** Structured field editing
**Notes:** The user preferred explicit structured review over annotation-first correction.

### Q6. Approval unit

| Option | Description | Selected |
|--------|-------------|----------|
| Scene/segment approval | Approve or hold reviewable chunks individually | ✓ |
| Item-level approval | Approve entities/events/rules one by one | |
| Submission-level approval | Approve the whole intake at once | |
| Mixed | Chunk approval with deeper drill-down approvals | |

**User's choice:** Scene/segment approval
**Notes:** Approval should align with the server-generated review segments.

### Q7. Canonical promotion timing

| Option | Description | Selected |
|--------|-------------|----------|
| Approved segments only | Promote only approved chunks into canonical revision state | ✓ |
| Finalize at end | Wait until all segments are approved, then promote once | |
| Temporary interpretation store first | Keep a full interim store, then finalize into canonical | |
| Other | User-defined alternative | |

**User's choice:** Promote only approved segments
**Notes:** Canonical state should advance incrementally as chunks are approved.

---

## API Flow and State Model

### Q8. Baseline API flow

| Option | Description | Selected |
|--------|-------------|----------|
| Submit -> extract -> review -> approve -> check | Keep review and checking as separate steps | ✓ |
| Submit -> extract+check | Run checking immediately after extraction | |
| Both | Support a fast path and a review path | |
| Other | User-defined alternative | |

**User's choice:** `submit -> extract -> review -> approve -> check`
**Notes:** Review-before-check is a hard boundary for this phase.

### Q9. Check trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Manual only | Run checks only when the user explicitly asks | ✓ |
| Auto after chunk approval | Re-check immediately when a chunk is approved | |
| Auto after full approval | Re-check once all chunks are approved | |
| Manual + auto | Support both automatic and manual check paths | |

**User's choice:** Manual only
**Notes:** Checking should be on-demand, not an automatic side effect.

### Q10. External state model

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit state machine | Expose `submitted`, `extracted`, `needs_review`, `partially_approved`, `approved`, `checked` | ✓ |
| Minimal states | Keep only simple `pending/done/failed` style states | |
| Rich internal, simple external | Hide the detailed workflow from API consumers | |
| Other | User-defined alternative | |

**User's choice:** Explicit state machine
**Notes:** The API should show the real review/check lifecycle rather than collapsing it.

---

## Ambiguity and Provenance

### Q11. How to expose ambiguous extraction

| Option | Description | Selected |
|--------|-------------|----------|
| Structured ambiguity fields | Expose `confidence`, `provenance`, `review_needed` style markers | ✓ |
| Force a single interpretation | Show one extracted result as if it were final | |
| Fail without candidates | Return extraction failure instead of reviewable ambiguity | |
| Other | User-defined alternative | |

**User's choice:** Expose structured ambiguity fields
**Notes:** Uncertainty must remain inspectable.

### Q12. Provenance granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Item-level span provenance | Keep source span or segment references for each structured item | ✓ |
| Segment-level provenance only | Keep provenance only at the chunk level | |
| Approved canonical only | Keep provenance only after final approval | |
| Other | User-defined alternative | |

**User's choice:** Item-level span provenance
**Notes:** Each extracted candidate should trace back to concrete source text.

### Q13. Original extraction vs. user correction

| Option | Description | Selected |
|--------|-------------|----------|
| Keep both | Preserve extracted candidate and user-corrected value | ✓ |
| Keep final only | Store only the corrected final result | |
| Keep diff only | Preserve the transformation but not the full original | |
| Other | User-defined alternative | |

**User's choice:** Keep both
**Notes:** Auditability of model reading vs. human correction is important.

### Q14. `review_needed` rule

| Option | Description | Selected |
|--------|-------------|----------|
| Low-confidence or conflicting candidates | Mark review-needed when confidence is low or candidates conflict | ✓ |
| Model self-report only | Mark review-needed only when the model explicitly says so | |
| Everything requires review | Default all extracted items to review-needed | |
| Other | User-defined alternative | |

**User's choice:** Low-confidence or conflicting candidates
**Notes:** The review queue should be driven by explicit rules rather than intuition alone.

---

## Extraction Engine Boundary

### Q15. Extraction boundary

| Option | Description | Selected |
|--------|-------------|----------|
| LLM-assisted extraction + deterministic normalization | Use an LLM for candidate extraction, then gate progression through schema and canonical normalization | ✓ |
| Rules/pattern only | Avoid LLM assistance and stay fully rule-based | |
| LLM near-final output | Let the LLM act as the effective structured-decoder authority | |
| Other | User-defined alternative | |

**User's choice:** LLM-assisted extraction + deterministic normalization
**Notes:** The model assists intake, but canonical promotion stays rule-bound.

### Q16. Handling normalization failure after schema parse

| Option | Description | Selected |
|--------|-------------|----------|
| Route to `review_needed` | Keep the candidate reviewable instead of auto-fixing or hard-failing | ✓ |
| Auto-correct and continue | Server tries to repair the candidate silently | |
| Request failure | Reject the request immediately | |
| Other | User-defined alternative | |

**User's choice:** Route to `review_needed`
**Notes:** Review should absorb imperfect-but-salvageable extraction.

### Q17. Model-call strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Single model + single prompt family | Stabilize one extraction contract first | ✓ |
| Multi-pass extraction | Separate passes for entities/events/rules | |
| Multi-model cross-check | Use multiple models for agreement/disagreement handling | |
| Other | User-defined alternative | |

**User's choice:** Single model + single prompt family
**Notes:** Multi-pass and multi-model strategies are deferred until the first contract is stable.

---

## the agent's Discretion

- Exact segmentation heuristics for turning full drafts into reviewable chunks
- Exact review patch payload shape
- Exact confidence threshold values behind `review_needed`
- Exact API route names and transport choices
- Exact persistence shape for in-progress review sessions

## Deferred Ideas

- Automatic check-on-approval flows
- Free-text annotation-based correction loops
- Multi-model or multi-pass extraction
- Mark-all-items-as-review-needed behavior
- Whole-draft all-at-once approval
