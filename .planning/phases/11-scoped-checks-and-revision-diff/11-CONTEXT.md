# Phase 11: Scoped Checks and Revision Diff - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 11 turns the Phase 9 scope contract and the Phase 10 approval-reset foundation into executable scoped checks and deterministic diff comparisons. It covers validating that a requested approved scope is runnable, persisting scope-aware verdict run metadata, and comparing run or revision results with scope labels and traceable finding deltas.

This phase does not add fuzzy cross-revision scope matching, best-effort partial checks, large-run inspection grouping, browser-heavy diff exploration, or queue-based execution. Those remain out of scope for Phase 11 and belong to Phase 12 or later work.

</domain>

<decisions>
## Implementation Decisions

### Scope Reference Contract
- **D-01:** Scoped check and scoped diff requests should reference persisted `scopeId` values only. Phase 11 should not accept inline scope objects in the public contract.

### Scoped Check Eligibility
- **D-02:** A scoped check may run when the requested scope's segments are all `approved` and `current` (`stale === false`). Phase 11 should not require the entire session to be fully approved if the requested scope itself is safe.
- **D-03:** Scoped checks must remain fail-closed. If any segment inside the requested scope is unapproved, stale, failed, or otherwise unresolved, the request returns an explicit conflict instead of silently shrinking scope.

### Diff Baseline and Comparison Inputs
- **D-04:** The default diff baseline remains the immediately previous run, matching the existing `previousRunId` chain.
- **D-05:** Phase 11 should also support explicit diff targets when needed, such as a caller-specified base run or base revision, rather than forcing previous-run comparison only.

### Cross-Revision Scope Matching
- **D-06:** Cross-revision diffing should only compare scopes that have deterministic persisted identity, specifically persisted `scopeId` values or stable section identity. Do not add `sourceTextRef` overlap or other best-effort matching heuristics in Phase 11.

### Diff and Trace Output
- **D-07:** Diff responses should include finding-level trace information, not only run-level summary. Each diff item should carry enough identifiers to connect the change back to scope, canonical evidence, and source context.
- **D-08:** The required diff trace payload should stay leaner than a full inspection dump. Include identifiers such as `findingId`, `verdictKind`, `scopeId`, relevant `segmentId` or `sourceTextRef`, and `ruleVersionId`, but do not inline the full evidence payload by default.

### Existing Boundaries to Preserve
- **D-09:** Hard verdict truth and soft-prior advisory output remain separate in scoped checks, exactly as in earlier manual checks.
- **D-10:** Phase 11 should extend the existing `submit -> extract -> review -> approve -> check` mental model. Scoped checks are a narrower execution target, not a new ingestion workflow.

### the agent's Discretion
- Exact route names and DTO field names for scoped check and diff requests, as long as persisted `scopeId` remains the public selection unit.
- Exact persistence shape for run-to-scope metadata, as long as downstream diff logic can resolve scope identity deterministically.
- Exact conflict error wording and diff response envelope shape, as long as failures remain explicit and finding-level trace fields stay available.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and Phase Contracts
- `.planning/PROJECT.md` - v1.1 draft-scale goal, explainability requirement, and the need for scope-safe checks and revision comparison without losing provenance.
- `.planning/REQUIREMENTS.md` - Phase 11 requirement set `DRAFT-02`, `CHECK-01`, `DIFF-01`, and `TRACE-01`.
- `.planning/ROADMAP.md` - fixed Phase 11 scope, success criteria, and three planned work slices.
- `.planning/STATE.md` - current workflow handoff after Phase 10 completion and the Phase 11 discuss session.

### Prior Phase Decisions
- `.planning/milestones/v1.0-phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md` - locked `submit -> extract -> review -> approve -> check` flow, explicit manual checks, segment-scoped approval, and provenance expectations.
- `.planning/milestones/v1.0-phases/07-soft-prior-runtime-integration/07-CONTEXT.md` - hard/soft separation that scoped checks must preserve in both runtime behavior and API output.
- `.planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md` - first-class `DraftCheckScope` contract, supported scope kinds, and the deliberate deferral of cross-revision segment matching.
- `.planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md` - explicit approval-reset semantics, honest mixed-state visibility, and the rule that full-session `/check` stayed blocked until scoped checks existed.
- `.planning/phases/10-incremental-extraction-and-review-resilience/10-VERIFICATION.md` - verified evidence that Phase 10 delivered the safe approval/reset foundation Phase 11 depends on.

### Code Surfaces
- `src/domain/drafts.ts` - current persisted scope schema (`full_approved_draft`, `section`, `segment_range`) and stable scope identity contract.
- `src/services/ingestion-check.ts` - current full-session gate that Phase 11 will narrow into requested-scope approval validation.
- `src/services/verdict-runner.ts` - live verdict execution path, `previousRunId` chaining, and inspection snapshot persistence.
- `src/services/verdict-diff.ts` - existing diff baseline logic against the immediately previous run.
- `src/api/routes/ingestion-check.ts` - current manual check route surface to extend for scoped execution.
- `src/api/schemas.ts` - current check response contract, session snapshot serialization, and location for new scoped check or diff DTOs.
- `tests/api/check-controls-api.test.ts` - current end-to-end check gate regressions that will need scoped-check coverage.
- `tests/engine/verdict-diff.test.ts` - existing diff behavior baseline that Phase 11 should extend instead of replacing.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DraftCheckScopeSchema` already persists the exact Phase 11 scope kinds and identifiers needed for request-time `scopeId` resolution.
- `executeIngestionCheck()` already enforces fail-closed approval gating and routes verdict execution through `executeVerdictRun()`.
- `executeVerdictRun()` already persists `previousRunId` and inspection snapshots, giving Phase 11 a stable run lineage base for diffing.
- `diffAgainstPreviousRun()` already computes added, resolved, persisted, and changed findings for the immediately previous run.

### Established Patterns
- API and domain boundaries are Zod-first and additive.
- Manual checks stay explicit and do not auto-run as a side effect of approval or extraction.
- Hard verdict persistence remains authoritative; soft priors are returned as a separate advisory block.
- Stable persisted IDs are preferred over heuristic matching or inferred workflow shortcuts.

### Integration Points
- Extend `src/services/ingestion-check.ts` with scope resolution and scope-local approval validation.
- Extend `src/services/verdict-runner.ts` and related run persistence so verdict runs can record which persisted scope they represent.
- Extend `src/services/verdict-diff.ts` so it can use the existing previous-run default while also accepting explicit run or revision baselines.
- Extend `src/api/routes/ingestion-check.ts` and `src/api/schemas.ts` with scoped check and diff request/response contracts that preserve existing fields where possible.
- Add regression coverage in `tests/api/check-controls-api.test.ts` and `tests/engine/verdict-diff.test.ts` for scope-local gating, explicit comparison targets, and finding-level trace output.

</code_context>

<specifics>
## Specific Ideas

- The public contract should stay conservative: use stored `scopeId`, not ad hoc inline scope objects.
- Scoped checks should unlock real partial progress, but only when the chosen scope is fully safe.
- Revision diffing should stay deterministic and identity-based rather than inventing fuzzy source-overlap matching too early.
- Diff output should be traceable enough for engineering-style inspection without collapsing into a full inspection-snapshot dump.

</specifics>

<deferred>
## Deferred Ideas

- `sourceTextRef` overlap or other best-effort cross-revision scope matching heuristics - future phase if deterministic scope identity proves too limiting.
- Full inspection-payload style evidence dumps inside diff responses - Phase 12 or later if the browser surface needs it.
- Large-run grouping, filtering, and UI-heavy diff exploration - Phase 12.
- Queue-backed or asynchronous scoped check orchestration - future work if request-time execution becomes insufficient.

</deferred>

---

*Phase: 11-scoped-checks-and-revision-diff*
*Context gathered: 2026-04-11*
