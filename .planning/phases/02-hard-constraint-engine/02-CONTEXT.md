# Phase 2: Hard Constraint Engine - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase turns the canonical StoryGraph model into a deterministic hard-constraint engine. It covers how physical, temporal, causal, and character-state contradictions are evaluated against explicit events, state boundaries, and active world rules. It does not yet add repair generation, corpus-backed soft priors, natural-language interpretation, or reader-facing visualization.

</domain>

<decisions>
## Implementation Decisions

### Checker Architecture
- **D-01:** Phase 2 uses family-separated checkers with a shared verdict pipeline rather than a single monolithic symbolic solver.
- **D-02:** The initial hard engine is implemented as TypeScript predicates/checker modules, not solver-first infrastructure.
- **D-03:** Checker execution order is `rule activation / override resolution -> time / space / physics -> causality -> character-state`.
- **D-04:** Upstream hard failures may short-circuit downstream checks when they invalidate later assumptions.
- **D-05:** Short-circuited checks must be recorded as secondary `not evaluated` states rather than silently disappearing.

### Hard Verdict Semantics
- **D-06:** `Hard Contradiction` is reserved for direct conflicts with the current canonical state and active rules.
- **D-07:** Missing explanation, missing setup, or undeclared exception conditions are classified as `Repairable Gap`, not hard failure.
- **D-08:** A path or event evaluation yields one representative verdict plus supporting findings, ordered by severity.
- **D-09:** Phase 2 verdicts must include canonical IDs, checker-specific reason codes, and a concise explanation, but not full proof traces yet.

### Rule Scope and Activation
- **D-10:** Rule precedence uses a fixed scope chain: `event-level > character-level > location-level > story-level > reality-default`.
- **D-11:** Numeric `priority` resolves collisions only inside the same scope level.
- **D-12:** Baseline rules such as reality-default and story-level defaults start active; exception or local override rules require explicit activation.
- **D-13:** Hard-rule packs are split by checker family: `time`, `space`, `physics`, `causality`, and `character`.

### Causality and Character-State Logic
- **D-14:** `causal_links` are the strongest causal evidence, but causal sufficiency may also be established through `preconditions + effects + temporal order + state changes` when explicit links are absent.
- **D-15:** Character-state contradiction checks compare an action against the immediately prior boundary first, then extend into earlier lineage only for relevant state axes.
- **D-16:** The lineage-aware axes are `loyalties`, `goals`, `knowledge`, `conditions`, and explicit `obligations / promises / threats`.
- **D-17:** Character contradiction logic must distinguish direct contradiction from missing justification by checking for absent counter-motives, constraints, or newly introduced conditions before escalating to hard failure.

### Evaluation Scope and Runtime
- **D-18:** Time, space, and physics checks operate primarily on adjacent event pairs.
- **D-19:** Causality checks operate on explicit causal paths plus canonical support signals.
- **D-20:** Aggregate consistency checks may inspect an entire revision when pairwise or path-local checks are insufficient.
- **D-21:** The reality-default movement baseline in v1 uses place hierarchy, `minTravelMinutes`, and simple movement rules rather than transport-mode simulation or external map data.
- **D-22:** Revision changes trigger full re-evaluation in Phase 2; impact-scoped rechecks are deferred to later phases.

### the agent's Discretion
- Exact reason-code taxonomy names, as long as they remain checker-specific and stable across tests.
- Exact file/module split between checker implementations, shared rule utilities, and verdict aggregation helpers.
- Internal representation of `not evaluated` dependency metadata, as long as it remains explicit in results.
- The precise APIs used to feed reconstructed boundaries and active rule sets into each checker.

</decisions>

<specifics>
## Specific Ideas

- The user wants the hard engine to behave like an auditable engineering checker, not a taste-based narrative critic.
- Missing explanation and direct impossibility must stay distinct because later repair logic depends on that separation.
- Reality-default rules should feel like the baseline world contract, while local or exceptional rules behave like explicit overrides rather than ambient assumptions.
- Character contradiction checks should remain evidence-led: a surprising betrayal is not automatically contradictory if coercion, threat, or a new obligation exists in canonical state.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and Phase Contracts
- `.planning/PROJECT.md` — project philosophy, explainability requirement, and hybrid logic-led judgment constraints
- `.planning/REQUIREMENTS.md` — Phase 2 requirements `RULE-01` through `RULE-04` and `VERD-01`
- `.planning/ROADMAP.md` — fixed Phase 2 boundary, success criteria, and plan breakdown
- `.planning/STATE.md` — current project state and cross-phase accumulated decisions

### Upstream Phase Outputs
- `.planning/phases/01-canonical-narrative-schema/01-CONTEXT.md` — locked modeling decisions that Phase 2 must honor
- `.planning/phases/01-canonical-narrative-schema/01-SECURITY.md` — accepted-risk and threat-verification context that should not be contradicted by new rule-engine assumptions
- `.planning/phases/01-canonical-narrative-schema/01-VALIDATION.md` — current test strategy and verification conventions to extend in Phase 2

### Scope Notes
- No external ADR/spec documents exist yet; the planning files above are the canonical design contract for this phase.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/domain/events.ts` — canonical event shape already exposes temporal relation, causal link IDs, and `minTravelMinutes`
- `src/domain/rules.ts` — rule metadata and normalized executable rule forms are already separated
- `src/domain/verdicts.ts` — verdict kinds and violation categories already exist as canonical runtime schemas
- `src/domain/transitions.ts` — revision-aware boundary query contracts already exist
- `src/services/snapshot-rebuilder.ts` — deterministic before/after state reconstruction is already available
- `src/services/story-boundary-query.ts` — query surface already returns reconstructed core slots and provenance
- `src/storage/repositories/story-repository.ts` — canonical events, state boundaries, and causal links already round-trip through storage
- `src/storage/repositories/rule-repository.ts` and `src/storage/repositories/verdict-repository.ts` — rule/version persistence and verdict persistence boundaries already exist

### Established Patterns
- Runtime validation is Zod-backed and paired with inferred TypeScript types from the same source modules.
- Persistence uses PostgreSQL schema + repository modules as the operational source of truth.
- Revision-aware and provenance-aware data flow is already normalized into the canonical model.
- The current test harness uses Vitest with pg-mem-backed integration fixtures for deterministic local validation.

### Integration Points
- Phase 2 checkers should consume reconstructed boundary snapshots plus canonical events/rules rather than reparsing raw prose.
- Verdict outputs should align with the existing `VerdictRecordSchema` and repository boundaries.
- Rule-pack execution logic should fit the existing metadata/version split instead of inventing a parallel rule storage path.
- Phase 2 regression tests should extend the current fixture strategy in `tests/canonical` and `tests/storage`.

</code_context>

<deferred>
## Deferred Ideas

- Solver-first or ASP-centered execution substrate — possible future refactor once the checker families stabilize
- Transport-mode modeling or external distance/map data integration — deferred beyond the first hard-engine pass
- Incremental impact-scoped recheck after revision diffs — deferred until rerun/diff workflows mature
- Full proof-trace verdicts — deferred until explanation and repair reasoning become the primary focus

</deferred>

---

*Phase: 02-hard-constraint-engine*
*Context gathered: 2026-04-09*
