# Phase 6: Verification and Traceability Closure - Research

**Researched:** 2026-04-10
**Domain:** Per-phase verification artifact backfill, requirement traceability reconciliation, and milestone audit reclassification
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MODEL-01 | User can represent characters, locations, objects, and world entities as explicit canonical records instead of prose-only notes | Phase 01 already has plans, summaries, UAT, security, validation, and canonical schema plus persistence tests. Phase 6 only needs an accepted verification artifact that maps those proofs into milestone-verifiable evidence. |
| MODEL-02 | User can represent character state at story boundaries, including knowledge, goals, loyalties, resources, and location | Phase 01 boundary-query and reconstruction behavior is already summarized and tested; the missing piece is a goal-backward verification report. |
| MODEL-03 | User can represent events with actors, time, place, preconditions, effects, and causal links | Phase 01 domain contracts and schema tests already cover the explicit event model; verification must cite that evidence directly. |
| MODEL-04 | User can declare world rules that define default physics and explicit exceptions | Phase 01 rule schemas and persistence behavior already exist; verification must trace them to concrete files and tests. |
| DATA-01 | System stores canonical story objects, rule packs, verdicts, and provenance in a queryable database | Phase 01 storage work is implemented; milestone audit currently rejects it only because no `01-VERIFICATION.md` exists. |
| RULE-01 | Engine can detect physical impossibility between linked events | Phase 02 rule-engine and regression tests already prove this; Phase 6 must translate them into accepted phase verification evidence. |
| RULE-02 | Engine can detect temporal contradictions, including impossible travel or duration assumptions | Phase 02 already has targeted temporal regressions; verification should cite those tests rather than repeat summary claims. |
| RULE-03 | Engine can detect causal gaps where a major outcome lacks sufficient prior cause | Phase 02 summaries and engine tests already claim this; verification must confirm with actual file/test evidence. |
| RULE-04 | Engine can detect character-state contradictions such as motive collapse, knowledge mismatch, or unexplained loyalty reversal | Phase 02 checker and regression coverage exist; verification must map the requirement to those artifacts. |
| VERD-01 | Engine classifies results as `Hard Contradiction`, `Repairable Gap`, `Soft Drift`, or `Consistent` | Phase 02 verdict classification is implemented; verification must prove the classification contract, not just the checker code. |
| VERD-02 | Each verdict cites the exact events, states, and rules used to reach the judgment | Phase 03 evidence-trace work is implemented and tested; verification must anchor this to the live contracts and tests. |
| VERD-03 | Verdicts can be rerun against updated story versions so changes in consistency are inspectable | Phase 03 verdict-run and diff support is already in place; Phase 6 needs to document the exact evidence chain. |
| REPR-01 | Engine can propose missing assumptions, rule declarations, or prior events that would repair a failing story path | Phase 03 repair generation already exists and is tested; verification must classify it as satisfied with live evidence. |
| REPR-02 | Engine can rank repair candidates separately from hard validity so plausible fixes do not masquerade as current truth | Phase 03 repair ranking behavior is implemented and tested; verification must preserve that distinction explicitly. |
| DATA-02 | System supports offline corpus extraction and analysis to build or revise soft priors | Phase 04 offline corpus normalization and prior-build pipeline are implemented and testable today. |
| FLOW-01 | User can submit natural-language synopsis or scene text and receive a normalized structured interpretation for review | Phase 05 submit/extract/review flow is implemented, UAT-validated, and integration-tested; verification must map it to accepted artifacts. |
| FLOW-03 | User can run consistency checks on demand and is not forced into realtime verdicting while drafting | Phase 05 manual `check` control path is implemented and tested; verification must cite the explicit request-only flow. |
</phase_requirements>

<research_summary>
## Summary

Phase 6 is not a new runtime capability phase. It is a verification-synthesis phase that closes a process gap: milestone audit rejected implemented work from Phases 01-05 because those phases lacked `*-VERIFICATION.md` artifacts. The live codebase already has the necessary evidence sources in each phase directory: `*-PLAN.md`, `*-SUMMARY.md`, `*-UAT.md`, `*-SECURITY.md`, `*-VALIDATION.md`, plus targeted test files in `tests/`. The correct Phase 6 move is to backfill verification artifacts from those sources and then reconcile `REQUIREMENTS.md` so requirement status reflects verification results instead of older pending placeholders.

The most important constraint is honesty of evidence. Verification reports must be goal-backward and evidence-limited: derive observable truths from each phase goal and success criteria, then prove them with actual code/test/doc evidence. Summary text is useful as an index, but it is not accepted evidence by itself. If a phase-level behavior is only partially implemented, the verification report must say so. This is especially important for Phase 04: `DATA-02` is implemented and testable, but `SOFT-01` is still a runtime gap because `evaluateSoftPriors` is not wired into `src/services/verdict-runner.ts`, `src/services/ingestion-check.ts`, or the API check response path. Phase 6 should therefore create `04-VERIFICATION.md`, classify `DATA-02` from live evidence, and leave `SOFT-01` unresolved for Phase 7 instead of laundering it into a pass.

The cleanest execution order is:
1. Backfill `01-VERIFICATION.md`, `02-VERIFICATION.md`, and `03-VERIFICATION.md` from existing artifacts and tests.
2. Backfill `04-VERIFICATION.md` and `05-VERIFICATION.md`, then update `REQUIREMENTS.md` so each row reflects verification truth instead of a generic pending state.
3. Re-run the milestone audit so orphaned verification debt disappears and the remaining blocker surface is reduced to the known Phase 7 runtime gap.
</research_summary>

<verification_contract>
## Verification Artifact Contract

Every backfilled `*-VERIFICATION.md` should follow the repo template in `.codex/get-shit-done/templates/verification-report.md` and include these sections:

- Frontmatter with `phase`, `verified`, `status`, and `score`
- `## Goal Achievement`
- `### Observable Truths`
- `### Required Artifacts`
- `### Key Link Verification`
- `## Requirements Coverage`
- `## Anti-Patterns Found`
- `## Human Verification Required`
- `## Gaps Summary`
- `## Verification Metadata`

Status rules for verification files:

- `passed` when all phase truths and in-scope requirements are verified
- `gaps_found` when at least one critical truth or requirement is still blocked
- `human_needed` only when automation cannot resolve a material verification step

Traceability status rules for `REQUIREMENTS.md`:

- `Verified` when the requirement is satisfied by a `passed` or requirement-level verified entry in a phase verification report
- `Blocked` when the verification report documents an unresolved critical gap for that requirement
- `Needs Human` when the verification report explicitly requires manual confirmation
- `Pending` only for future-phase ownership such as `SOFT-01` in Phase 7 and `FLOW-02` in Phase 8
</verification_contract>

<phase_specific_evidence>
## Phase-Specific Evidence Sources

### Phase 01
- Docs: `01-01-PLAN.md`, `01-02-PLAN.md`, `01-03-PLAN.md`, matching summaries, `01-UAT.md`, `01-SECURITY.md`, `01-VALIDATION.md`
- Runtime evidence: `tests/canonical/schema.test.ts`, `tests/canonical/reconstruction.test.ts`, `tests/storage/persistence.test.ts`

### Phase 02
- Docs: `02-01-PLAN.md`, `02-02-PLAN.md`, `02-03-PLAN.md`, matching summaries, `02-UAT.md`, `02-SECURITY.md`, `02-VALIDATION.md`
- Runtime evidence: `tests/engine/hard-constraint-engine.test.ts`, `tests/engine/checker-families.test.ts`, `tests/engine/regression-physical-temporal.test.ts`, `tests/engine/regression-causality-character.test.ts`, `tests/engine/regression-overrides.test.ts`, `tests/engine/rule-activation.test.ts`

### Phase 03
- Docs: `03-01-PLAN.md`, `03-02-PLAN.md`, `03-03-PLAN.md`, matching summaries, `03-UAT.md`, `03-SECURITY.md`, `03-VALIDATION.md`
- Runtime evidence: `tests/engine/evidence-traces.test.ts`, `tests/engine/repair-generator.test.ts`, `tests/engine/verdict-runner.test.ts`, `tests/engine/verdict-diff.test.ts`

### Phase 04
- Docs: `04-01-PLAN.md`, `04-02-PLAN.md`, matching summaries, `04-UAT.md`, `04-SECURITY.md`, `04-VALIDATION.md`
- Runtime evidence: `tests/corpus/corpus-normalization.test.ts`, `tests/corpus/prior-build.test.ts`
- Gap evidence for `SOFT-01`: `tests/engine/soft-prior-scoring.test.ts`, `tests/engine/repair-plausibility.test.ts`, and the absence of runtime calls to `evaluateSoftPriors` outside `src/services/soft-prior-evaluator.ts`

### Phase 05
- Docs: `05-01-PLAN.md`, `05-02-PLAN.md`, matching summaries, `05-UAT.md`, `05-SECURITY.md`, `05-VALIDATION.md`
- Runtime evidence: `tests/services/natural-language-extraction.test.ts`, `tests/storage/ingestion-session-repository.test.ts`, `tests/services/ingestion-review-workflow.test.ts`, `tests/api/ingestion-review-api.test.ts`, `tests/api/check-controls-api.test.ts`
</phase_specific_evidence>

<anti_patterns>
## Anti-Patterns to Avoid

- Treating `*-SUMMARY.md` completion claims as sufficient evidence without checking the code and tests they reference
- Marking `SOFT-01` as verified in Phase 6; the current runtime/API path still does not expose soft-prior output
- Updating `REQUIREMENTS.md` rows to `Verified` before the corresponding verification report exists and documents supporting evidence
- Rewriting roadmap scope to hide blockers instead of classifying them honestly in verification and audit artifacts
</anti_patterns>

<recommendation>
## Primary Recommendation

Plan Phase 6 as two parallel documentation backfill plans plus one audit-closure plan:

- `06-01` backfills verification artifacts for Phases 01-03
- `06-02` backfills verification artifacts for Phases 04-05 and reconciles `REQUIREMENTS.md`
- `06-03` reruns the milestone audit and removes verification-orphan blockers, leaving only the known Phase 7 runtime integration gap
</recommendation>
