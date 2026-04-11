# Phase 10: Incremental Extraction and Review Resilience - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11T04:30:00Z
**Phase:** 10-incremental-extraction-and-review-resilience
**Mode:** Non-interactive `/gsd-next` fallback
**Areas discussed:** Extraction targeting and retry, Review state and staleness, Approval guardrails, Failure and status reporting

---

## Extraction Targeting and Retry

| Option | Description | Selected |
|--------|-------------|----------|
| Whole-session only | Keep extraction as an all-segments operation for every retry. | |
| Explicit `segmentId[]` targeting with whole-session default | Allow selected reruns for named segments while keeping full-session extraction when no selection is provided. | ✓ |
| Section or range selectors first | Make chapter or range targeting the primary extraction interface immediately. | |

**User's choice:** Auto-selected default from `/gsd-next` non-interactive fallback.
**Notes:** Phase 09 already gives stable segment IDs. Using explicit segment targeting solves Phase 10 without pulling Phase 11 scope semantics forward.

---

## Review State and Staleness

| Option | Description | Selected |
|--------|-------------|----------|
| Retry resets the full session | Any targeted retry or edit resets the whole draft review lifecycle. | |
| Only touched segments become stale or review-required | Targeted retries and material edits invalidate only affected segments while preserving unaffected segments. | ✓ |
| Background job queue with async status tracking | Model retries as asynchronous jobs with separate orchestration state. | |

**User's choice:** Auto-selected default from `/gsd-next` non-interactive fallback.
**Notes:** This matches the roadmap goal of independent segment handling and preserves the current request-driven architecture.

---

## Approval Guardrails

| Option | Description | Selected |
|--------|-------------|----------|
| Keep approved segments approved after edits | Boundary or extraction changes do not clear approval. | |
| Demote changed approved segments and require reapproval | Material edits or retries clear approval on the touched segment before it can contribute to a fully approved session again. | ✓ |
| Lock approved segments completely until manual reopen | Approved segments cannot be edited or retried in the same workflow. | |

**User's choice:** Auto-selected default from `/gsd-next` non-interactive fallback.
**Notes:** This preserves partial progress while preventing silent canonical drift after a segment has already been promoted.

---

## Failure and Status Reporting

| Option | Description | Selected |
|--------|-------------|----------|
| Session-level state only | Report a single aggregate workflow state with no per-segment retry metadata. | |
| Additive per-segment retry and error fields plus honest aggregate state | Persist segment attempt counts, failure summaries, and stale markers while keeping aggregate session status explicit. | ✓ |
| Separate job tables and queue lifecycle | Introduce queue-specific operational tracking in this phase. | |

**User's choice:** Auto-selected default from `/gsd-next` non-interactive fallback.
**Notes:** Phase 10 needs explicit mixed-outcome reporting, but not new runtime infrastructure.

---

## the agent's Discretion

- Exact naming for new retry, stale, or partial extraction workflow states.
- Whether approval demotion happens automatically on every material edit or behind a narrowly defined reopen helper, as long as silent approved-state drift is prevented.
- Exact request and response field naming for additive extraction target and retry metadata.

## Deferred Ideas

- Approved-scope checks and scope-aware check routing - Phase 11.
- Revision diff and comparison workflow - Phase 11.
- Large-run inspection grouping and filtering - Phase 12.
- Queue-backed extraction orchestration - future work if synchronous retries become too limiting.
