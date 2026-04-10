# Stack Research: v1.1 Draft Scale

## Recommendation

Keep v1.1 on the existing TypeScript-first stack. The current codebase already has the primitives needed for chapter-scale draft analysis:

- TypeScript and Zod domain contracts for ingestion sessions, segments, candidates, verdicts, repairs, priors, and inspection DTOs.
- Fastify API routes for submit, extract, read, review, approve, check, and inspection.
- PostgreSQL-style migrations and repositories, verified locally through pg-mem.
- Vitest coverage across canonical, engine, ingestion, priors, storage, and API layers.
- Playwright coverage for the browser inspection surface.

v1.1 should add schema and service capabilities, not a new framework. The main work is richer draft identity, scoped processing, revision comparison, and job state.

## Existing Fit

Current implementation already supports:

- `submissionKind: "full_draft"` and deterministic segmentation in `src/services/ingestion-session.ts`.
- Segment review and promotion through `src/services/ingestion-review.ts`.
- Session-level manual checks through `src/services/ingestion-check.ts`.
- Previous-run verdict diffing through `src/services/verdict-diff.ts`.
- Inspection snapshots through `src/services/inspection-payload.ts` and `src/storage/migrations/0004_verdict_run_inspection_snapshot.sql`.

These are the right foundations, but they are currently session-centric. v1.1 needs document/chapter/revision scope so the user can analyze a larger draft without treating the whole draft as one opaque submission.

## Data Model Needs

Recommended additions:

- Draft document identity: stable story-level container for a manuscript or chapter set.
- Draft revision identity: explicit revision lineage instead of only the generated `revision:draft:{sessionId}` target.
- Segment hierarchy: document, chapter, scene, paragraph, and sentence window metadata.
- Scope metadata: check requests should identify the selected chapter, segment range, or revision pair.
- Extraction job state: each segment should be independently extractable, retryable, and reportable.
- Review checkpoints: approved segments should remain stable when later segments fail extraction or require correction.

The existing ingestion tables can be extended, but v1.1 should avoid overloading `raw_text` and `draft_title` as the only draft-level metadata.

## Runtime Pattern

Use synchronous API boundaries for small actions and resumable service state for long-running work:

- Submit creates the document/revision/session and deterministic segment plan.
- Extract can process selected segments and record per-segment failures.
- Review applies corrections and approvals one segment at a time.
- Check runs over an explicit approved scope.
- Diff compares runs or revisions with deterministic finding fingerprints and trace IDs.

No queue dependency is required for v1.1 if the implementation keeps batch steps explicit and resumable. A real background worker can be deferred until manuscript-scale processing or multi-user collaboration needs it.

## Dependencies

No new runtime dependencies are recommended for v1.1.

Potential future dependencies:

- A dedicated job queue only after draft batches need unattended background execution.
- A text parser only if Markdown or manuscript formats become first-class inputs.
- Vector retrieval only when cross-draft pattern search becomes a product requirement.

## Verification Approach

Extend existing checks:

- Unit tests for segmentation, scope validation, revision lineage, and job-state transitions.
- Storage tests for new draft/revision/scope persistence.
- API tests for submit/extract/review/check/diff flows across multiple segments.
- Engine tests proving deterministic verdict truth does not change when checks are scoped.
- Browser tests for large-run filtering and revision diff inspection.

## Risks

- Treating a full draft as one session-level blob will make review and traceability brittle.
- Running checks before partial approval boundaries are clear can pollute canonical state.
- Reusing previous-run diff without revision/scope metadata can produce misleading comparisons.
- Adding async infrastructure too early can hide simpler state-machine bugs.
