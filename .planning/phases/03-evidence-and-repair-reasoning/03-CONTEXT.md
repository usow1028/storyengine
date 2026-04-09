# Phase 3: Evidence and Repair Reasoning - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase makes StoryGraph verdicts explainable and revision-oriented. It covers structured evidence snapshots, deterministic explanation output, repair candidate generation and ranking, and rerun/diff behavior across verdict runs. It does not yet add corpus-backed plausibility priors, natural-language ingestion, or UI-heavy inspection surfaces.

</domain>

<decisions>
## Implementation Decisions

### Evidence Model and Explanation Shape
- **D-01:** Failing verdicts expose structured evidence rather than ID-only references.
- **D-02:** Evidence must include canonical IDs, reason code, concise summaries of the relevant events, states, and rules, plus the conflict or missing-cause path and missing-premise summary.
- **D-03:** Evidence snapshots store the directly relevant state axes plus the immediately preceding state change that made those axes relevant.
- **D-04:** Evidence is persisted as a structured snapshot at verdict time rather than reconstructed on demand from ID pointers alone.
- **D-05:** User-facing explanation text is generated deterministically by composing structured evidence fields rather than by LLM wording.

### Repair Candidate Semantics
- **D-06:** Repair generation branches by verdict kind and reason taxonomy instead of emitting the same repair families for every failure.
- **D-07:** Repair candidates are stored as typed repair objects, with human-readable summaries rendered from those objects.
- **D-08:** Repair generation is evidence-first and may use only limited inference that is explicitly allowed by the reason taxonomy.
- **D-09:** The generator searches locally around the failing path rather than scanning the full revision or external case history in Phase 3.
- **D-10:** Prior-event repairs are inserted at the causal-path break point first, not merely at the event immediately before the contradiction.

### Repair Ranking and Presentation
- **D-11:** Repair ranking is separate from current validity and orders candidates by `minimal change -> fit with current story/world -> locality`.
- **D-12:** Repair suggestions are generated for the representative failing verdict and for supporting findings only when those findings are themselves repairable.
- **D-13:** Candidate deduplication merges overlapping repairs into one displayed option while preserving provenance to all source findings internally.
- **D-14:** Candidate output is capped at the top three repair options per failing verdict.
- **D-15:** User-facing repair confidence is shown as ordinal bands (`high`, `medium`, `low`) rather than raw numeric scores.
- **D-16:** Repair composition defaults to single repair objects, with only tightly limited small bundles allowed when the taxonomy explicitly permits them.

### Rerun and Diff Behavior
- **D-17:** Rerun comparison shows representative verdict changes plus supporting-finding changes, not just a single headline label.
- **D-18:** Finding continuity across reruns uses a stable finding ID rather than plain reason-code or semantic matching.
- **D-19:** Every evaluation execution records a separate verdict run, even when multiple runs target the same revision.
- **D-20:** Phase 3 diff compares the current run against the immediately previous verdict run only.

### Evaluation Output Boundaries
- **D-21:** `not evaluated` downstream findings remain visible in explanation output as blocked analyses, but they do not receive repair candidates.
- **D-22:** Repair candidates must remain suggestions; they are never represented as already-true canonical updates or auto-applied patches.

### the agent's Discretion
- Exact stable-finding fingerprint composition, as long as it remains deterministic and compatible with rerun diffing.
- Exact internal score calculation that maps candidate ordering into `high / medium / low` confidence bands.
- Exact typed-repair schema boundaries for each reason code family, as long as they preserve provenance and deterministic rendering.
- Exact snapshot field names and storage layout for evidence payloads, as long as the persisted data can support rerun diff, explanation output, and repair provenance.

</decisions>

<specifics>
## Specific Ideas

- The user wants verdict explanation to behave like engineering inspection output, not like a vague literary note.
- Repair candidates must stay clearly separate from current truth so that a plausible fix does not masquerade as a valid story state.
- Evidence and repair should stay locally grounded in the failing path instead of jumping to broad speculative interpretation.
- Rerun history should preserve auditability at the run level, not collapse repeated checks into a single overwritten record.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and Phase Contracts
- `.planning/PROJECT.md` — project philosophy, explainability requirement, and logic-led judgment constraint
- `.planning/REQUIREMENTS.md` — Phase 3 requirements `VERD-02`, `VERD-03`, `REPR-01`, and `REPR-02`
- `.planning/ROADMAP.md` — fixed Phase 3 boundary, success criteria, and plan breakdown
- `.planning/STATE.md` — current project state and cross-phase accumulated decisions

### Upstream Phase Outputs
- `.planning/phases/01-canonical-narrative-schema/01-CONTEXT.md` — locked canonical modeling and persistence decisions that evidence and repair must honor
- `.planning/phases/02-hard-constraint-engine/02-CONTEXT.md` — locked hard-engine verdict, checker, and rule semantics that Phase 3 must explain rather than redefine
- `.planning/phases/02-hard-constraint-engine/02-SECURITY.md` — current threat posture and mitigation expectations around verdict persistence and engine behavior
- `.planning/phases/02-hard-constraint-engine/02-VALIDATION.md` — existing validation surface and test coverage conventions to extend in Phase 3

### Scope Notes
- No external specs exist beyond the planning artifacts above; Phase 3 requirements are fully anchored in the project, roadmap, and phase-context files.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/engine/hard-constraint-engine.ts` — current event-path and revision evaluation orchestration that Phase 3 explanations and rerun tracking will wrap or extend
- `src/engine/verdict-aggregator.ts` — representative verdict and supporting-finding synthesis that Phase 3 must preserve while adding evidence and repair output
- `src/engine/rule-activation.ts` — active-rule resolution and blocked-checker semantics already define what evidence must cite
- `src/engine/checkers/*.ts` — checker-family reason codes and findings are the immediate inputs to evidence snapshots and repair families
- `src/domain/verdicts.ts` — canonical verdict schema is the current contract to extend for richer evidence and rerun metadata
- `src/domain/events.ts`, `src/domain/rules.ts`, `src/domain/transitions.ts` — canonical event, rule, and boundary contracts already define the source material for explanation and repair
- `src/services/snapshot-rebuilder.ts` and `src/services/story-boundary-query.ts` — deterministic state reconstruction and boundary access should feed evidence snapshots and prior-event insertion points
- `src/storage/repositories/verdict-repository.ts` — existing verdict persistence boundary is the natural place to evolve toward run-aware evidence storage
- `src/storage/repositories/story-repository.ts` and `src/storage/repositories/rule-repository.ts` — canonical graph and active rule data already round-trip through storage and should remain the explanation source of truth

### Established Patterns
- Runtime schemas are Zod-backed and mirrored by TypeScript types, so new evidence and repair objects should follow the same pattern.
- Repository modules are the canonical persistence boundary; Phase 3 should not introduce ad hoc verdict history storage outside that layer.
- Deterministic engine behavior already favors explicit reason codes and typed findings over freeform interpretation, and Phase 3 should preserve that bias.
- Vitest plus pg-mem-backed persistence tests are already the standard validation path for deterministic engine and storage behavior.

### Integration Points
- Phase 3 should extend the current finding/verdict pipeline rather than replacing Phase 2 checker outputs.
- Evidence snapshots should be assembled from existing canonical event, boundary, and active-rule facts rather than from prose or UI state.
- Repair generation should consume representative verdicts and supporting findings without mutating canonical story data.
- Rerun and diff support should integrate with verdict persistence so run histories stay queryable and auditable.

</code_context>

<deferred>
## Deferred Ideas

- Corpus-backed plausibility priors for repair ranking — belongs to Phase 4
- Natural-language repair narration or LLM paraphrase of explanations — deferred until after the deterministic explanation core is proven
- Arbitrary historical run comparison beyond the immediately previous run — deferred beyond the first rerun/diff implementation
- Full proof-trace or symbolic derivation output — deferred until a later explanation-depth phase if still needed

</deferred>

---

*Phase: 03-evidence-and-repair-reasoning*
*Context gathered: 2026-04-09*
