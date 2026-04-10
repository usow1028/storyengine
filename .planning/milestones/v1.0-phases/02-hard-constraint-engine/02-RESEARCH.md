# Phase 2: Hard Constraint Engine - Research

**Researched:** 2026-04-09
**Domain:** Deterministic story-consistency checking over canonical events, state boundaries, and world rules
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Phase 2 uses family-separated checkers with a shared verdict pipeline rather than a single monolithic symbolic solver.
- **D-02:** The initial hard engine is implemented as TypeScript predicates/checker modules, not solver-first infrastructure.
- **D-03:** Checker execution order is `rule activation / override resolution -> time / space / physics -> causality -> character-state`.
- **D-04:** Upstream hard failures may short-circuit downstream checks when they invalidate later assumptions.
- **D-05:** Short-circuited checks must be recorded as secondary `not evaluated` states rather than silently disappearing.
- **D-06:** `Hard Contradiction` is reserved for direct conflicts with the current canonical state and active rules.
- **D-07:** Missing explanation, missing setup, or undeclared exception conditions are classified as `Repairable Gap`, not hard failure.
- **D-08:** A path or event evaluation yields one representative verdict plus supporting findings, ordered by severity.
- **D-09:** Phase 2 verdicts must include canonical IDs, checker-specific reason codes, and a concise explanation, but not full proof traces yet.
- **D-10:** Rule precedence uses a fixed scope chain: `event-level > character-level > location-level > story-level > reality-default`.
- **D-11:** Numeric `priority` resolves collisions only inside the same scope level.
- **D-12:** Baseline rules such as reality-default and story-level defaults start active; exception or local override rules require explicit activation.
- **D-13:** Hard-rule packs are split by checker family: `time`, `space`, `physics`, `causality`, and `character`.
- **D-14:** `causal_links` are the strongest causal evidence, but causal sufficiency may also be established through `preconditions + effects + temporal order + state changes` when explicit links are absent.
- **D-15:** Character-state contradiction checks compare an action against the immediately prior boundary first, then extend into earlier lineage only for relevant state axes.
- **D-16:** The lineage-aware axes are `loyalties`, `goals`, `knowledge`, `conditions`, and explicit `obligations / promises / threats`.
- **D-17:** Character contradiction logic must distinguish direct contradiction from missing justification by checking for absent counter-motives, constraints, or newly introduced conditions before escalating to hard failure.
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

### Deferred Ideas (OUT OF SCOPE)
- Solver-first or ASP-centered execution substrate.
- Transport-mode modeling or external distance/map data integration.
- Incremental impact-scoped recheck after revision diffs.
- Full proof-trace verdicts.
</user_constraints>

<research_summary>
## Summary

Phase 2 should be built as a deterministic engine layer on top of the already-finished canonical storage and reconstruction work, not as a new modeling pass. The existing repository and service surface already gives the hard engine what it needs: ordered events, place hierarchy, rule metadata plus executable references, and before/after boundary reconstruction for character facts. The fastest reliable path is to add a dedicated `src/engine/` module family that consumes those inputs directly and emits structured findings with stable reason codes.

The main codebase gap is not the absence of a solver. It is the absence of execution-oriented rule binding and verdict evidence structure. Today rules know their `scope` and `priority`, but they do not yet point to the exact location, character, or event they govern. Likewise, verdict records already persist evidence IDs but do not yet capture checker family, reason code, supporting findings, or `not evaluated` metadata. Phase 2 should therefore first close those execution gaps, then layer the checker runtime on top.

The recommended approach is: keep executable rule packs in the existing repository flow using `predicate` rule versions, add explicit scope targeting plus rule-activation resolution, implement five checker families in TypeScript, and aggregate them into one representative verdict per evaluated path with supporting findings preserved. This matches the locked phase decisions, minimizes risk, and keeps a future clingo/ASP refactor possible without forcing it into this phase.

**Primary recommendation:** Build a TypeScript `hard-constraint-engine` around explicit rule activation, family-separated checkers, and structured verdict aggregation, while deferring solver-first execution and transport simulation.
</research_summary>

<standard_stack>
## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9 | Deterministic checker implementation and explicit contracts | Already the canonical domain/runtime language and the best fit for refactor-safe reasoning modules |
| Zod | current project stable | Runtime validation for engine findings, verdict evidence, and rule activation snapshots | Matches the existing domain style and prevents silent drift between checker output and persistence |
| Vitest | current project stable | Unit and regression coverage for checker families and engine orchestration | Already the active test harness with fast local execution |
| PostgreSQL schema + repositories | existing Phase 1 layer | Canonical source of truth for events, boundaries, rules, verdicts, and provenance | The engine should consume stored canonical facts, not invent a parallel state store |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pg-mem | current project stable | Repository-backed integration fixtures for verdict and rule loading | Use when engine tests need persistence behavior without a live Postgres instance |
| Existing snapshot services | current repo implementation | Before/after boundary facts for character state checks | Use whenever a checker needs state at a boundary instead of rereading raw rows |
| Existing rule metadata/version split | current repo implementation | Executable rule pack bridge for baseline rules and local overrides | Use instead of inventing a second rule storage mechanism |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TypeScript predicate engine | clingo / ASP now | Stronger formal solving, but it conflicts with the locked Phase 2 choice to start with family-separated TypeScript checkers |
| Existing repository-backed rule loading | ad hoc JSON fixtures only | Faster for a spike, but would disconnect the engine from the canonical persistence model it must trust |
| Place hierarchy + `minTravelMinutes` | transport-mode simulation | More detailed, but outside the locked scope for v1 hard constraints |

**Installation:**
```bash
# No new packages are required for the recommended Phase 2 path.
# Reuse the current workspace:
npm install
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```text
src/
├── domain/                 # canonical schemas and evidence contracts
├── engine/                 # rule activation, checker families, verdict aggregation
│   ├── checkers/           # time, space, physics, causality, character
│   └── index.ts            # engine export surface
├── services/               # orchestration-facing adapters and boundary utilities
└── storage/                # repositories and migration-backed canonical persistence
```

### Pattern 1: Rule Activation Snapshot
**What:** Resolve the effective rule set for a specific event/path before any checker runs.
**When to use:** Every evaluation entry point, because precedence and activation status define what counts as a contradiction.
**Example:**
```typescript
const activeRules = resolveActiveRuleSet({
  graph,
  eventId,
  actorIds,
  placeId,
  explicitRuleChanges
});
```

### Pattern 2: Checker Family Isolation
**What:** Each checker family reads the same evaluation context but owns its own reason codes and evidence assembly.
**When to use:** Always. It keeps rule semantics debuggable and prevents time/space logic from leaking into character or causality logic.
**Example:**
```typescript
const findings = [
  ...runTimeChecks(context),
  ...runSpaceChecks(context),
  ...runPhysicsChecks(context)
];
```

### Pattern 3: Representative Verdict Aggregation
**What:** Collect all findings, sort by severity, emit one representative verdict plus supporting findings and skipped-check metadata.
**When to use:** At engine boundaries that return user-facing or persisted verdict records.
**Example:**
```typescript
const verdict = aggregateFindings({
  findings,
  skipped,
  severityOrder: [
    "Hard Contradiction",
    "Repairable Gap",
    "Soft Drift",
    "Consistent"
  ]
});
```

### Anti-Patterns to Avoid
- **Monolithic checker service:** Do not collapse all rules into one giant evaluator. It makes reason codes unstable and short-circuit semantics opaque.
- **Scope without target binding:** A rule scope like `location` or `character` is not executable unless the engine also knows which location or character it targets.
- **Missing-justification as hard failure:** This would destroy the distinction the user explicitly wants between contradiction and later-repairable incompleteness.
- **Heuristic state lookups outside canonical reconstruction:** Character checks must use the stored boundary + delta pipeline, not custom ad hoc scans.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Boundary state recovery | A second bespoke state tracker in the engine | `SnapshotRebuilder` and `StoryBoundaryQueryService` | The existing services already preserve provenance and revision semantics |
| Verdict persistence format | A new verdict table or sidecar JSON log | `VerdictRepository` with richer evidence payloads | The current repository already owns verdict persistence and can absorb richer evidence without forking storage |
| Rule storage for execution | A separate engine-only rule registry | `RuleRepository` plus `predicate` executable rule versions | Keeps one source of truth for baseline and user-authored rules |
| Travel realism | A transport simulator or live map lookup | Place hierarchy + `minTravelMinutes` + rule overrides | The locked phase scope explicitly avoids external distance and transport modeling |

**Key insight:** Phase 2 should add execution semantics to the canonical layer that already exists, not create a second partial engine beside it.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Scope Precedence Without Scope Target
**What goes wrong:** Event, character, and location rules all exist, but the engine cannot determine which concrete rule applies to the current event.
**Why it happens:** The model stores `scope` and `priority` but not the concrete target ID for local scopes.
**How to avoid:** Add a single explicit `scopeTargetId` field to rule metadata and persist it through the repository and migration layers.
**Warning signs:** Rule activation logic falls back to string matching on descriptions or `worldAffiliation`.

### Pitfall 2: Hidden Short-Circuiting
**What goes wrong:** A physical impossibility blocks downstream checks, but the final verdict gives no clue that causality or character checks were skipped.
**Why it happens:** Short-circuit decisions are implemented as control flow only, not as explicit result data.
**How to avoid:** Model `not evaluated` as a first-class structured payload with the blocking checker and reason code.
**Warning signs:** Final results contain fewer findings than expected with no dependency explanation.

### Pitfall 3: Character Checker Becoming Literary Taste
**What goes wrong:** The engine flags “surprising” behavior as contradiction even when coercion, promises, or new knowledge should make it coherent.
**Why it happens:** The checker compares only action labels or archetypes instead of boundary state plus counter-motives.
**How to avoid:** Always read immediate prior boundary first, then lineage-aware axes (`loyalties`, `goals`, `knowledge`, `conditions`, `obligations/promises/threats`) before escalating.
**Warning signs:** Betrayal, retreat, or silence events fail even when a threat or obligation is present in canonical state.

### Pitfall 4: Causality Over-Inference
**What goes wrong:** Any earlier event gets treated as “enough cause” for a later outcome.
**Why it happens:** Temporal order alone is used as causal sufficiency.
**How to avoid:** Treat `causal_links` as strongest evidence and only accept fallback sufficiency when preconditions, effects, order, and state changes jointly support the outcome.
**Warning signs:** Major outcomes pass causality checks despite no direct link and no relevant state transition.
</common_pitfalls>

<code_examples>
## Code Examples

Verified implementation patterns for this project:

### Engine-Level Finding Shape
```typescript
export const CheckerFindingSchema = z.object({
  checker: z.enum(["time", "space", "physics", "causality", "character"]),
  reasonCode: z.string().min(1),
  verdictKind: VerdictKindSchema,
  category: ViolationCategorySchema,
  explanation: z.string().min(1),
  evidence: VerdictEvidenceSchema
});
```

### Rule Activation Entry Point
```typescript
export function resolveActiveRuleSet(input: {
  graph: CanonicalStoryGraph;
  eventId: string;
  actorIds: string[];
  placeId?: string;
  explicitRuleChanges: EventRuleChange[];
}) {
  // Apply fixed scope precedence first, then same-scope priority.
}
```

### Representative Verdict Aggregation
```typescript
export function aggregateFindings(input: {
  findings: CheckerFinding[];
  skipped: NotEvaluatedFinding[];
}) {
  // Select one representative verdict, keep supporting findings,
  // preserve skipped-check metadata, and return a stable record.
}
```
</code_examples>

<sota_updates>
## State of the Art (Project Direction 2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| “Phase 2 should add a primary symbolic solver first” | “Phase 2 should use TypeScript predicate checkers first and keep solver integration deferrable” | Locked by 2026-04-09 Phase 2 context | Plans must target executable checker modules, not clingo infrastructure |
| Ambiguous verdict payloads | Structured evidence with reason codes, supporting findings, and skipped-check metadata | Required by Phase 2 decision D-09 | Verdict persistence and tests must check explanation structure, not only verdict labels |
| Scope-only rule metadata | Scope plus concrete scope target binding | Recommended by this research pass | Makes precedence and activation deterministic instead of heuristic |

**New tools/patterns to consider later:**
- Predicate-to-ASP adapter layer once checker families stabilize and the team wants satisfiability search without changing external APIs.
- Impact-scoped reruns after revision diffs once Phase 3 introduces rerun comparison and verdict diffing.

**Deprecated/outdated for this phase:**
- Solver-first planning for hard constraints.
- External map or transport integration for physical plausibility.
</sota_updates>

## Validation Architecture

Phase 2 should keep the Phase 1 testing model: short deterministic Vitest runs after each task, then full-suite confirmation after each wave. The engine should introduce a dedicated `tests/engine/` namespace so checker-family tests, orchestration tests, and regression-matrix tests can evolve without polluting canonical schema or storage tests.

Recommended validation split:
- `tests/engine/checker-families.test.ts` — unit coverage for reason codes and family-local contradiction vs repairable classification
- `tests/engine/rule-activation.test.ts` and `tests/engine/hard-constraint-engine.test.ts` — integration coverage for activation precedence, short-circuiting, and representative verdict aggregation
- `tests/engine/regression-*.test.ts` plus shared fixtures — deterministic story scenarios for impossible travel, causal gap, betrayal under coercion, and rule overrides

Wave 0 is already satisfied by the existing Vitest workspace. No new framework bootstrap is required for Phase 2.

<open_questions>
## Open Questions

1. **Should `scopeTargetId` live on rule metadata or on normalized executable rules?**
   - What we know: Precedence and activation are properties of the rule pack in the current model, not of a specific executable format.
   - What's unclear: Whether later rule-version churn could require target changes across versions.
   - Recommendation: Put `scopeTargetId` on `RulePackMetadata` in Phase 2. Revisit only if Phase 3 introduces version-specific target semantics.

2. **Should representative and supporting findings be stored as top-level verdict columns or inside `evidence`?**
   - What we know: The current table already stores `evidence` as jsonb and no query path yet needs relational indexing on reason codes.
   - What's unclear: Whether Phase 6 inspection UI will need relational filtering by checker/reason code.
   - Recommendation: Keep reason codes and supporting findings inside structured `evidence` for Phase 2, then revisit relational promotion if Phase 6 query patterns demand it.

3. **How much of `preconditions` can be treated as hard causal evidence?**
   - What we know: The existing `description` field is textual, while `requiredRuleVersionId` is structured.
   - What's unclear: Whether textual preconditions are reliable enough for more than supportive evidence.
   - Recommendation: Use structured signals (`requiredRuleVersionId`, state changes, causal links, ordered boundaries) as hard inputs; treat free-text preconditions as explanatory only in Phase 2.
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `.planning/phases/02-hard-constraint-engine/02-CONTEXT.md` — locked phase decisions and execution semantics
- `.planning/ROADMAP.md` — Phase 2 goal, success criteria, and plan decomposition
- `src/domain/events.ts` — canonical event timing, preconditions, effects, and `minTravelMinutes`
- `src/domain/rules.ts` — current rule metadata/version split and scope semantics
- `src/domain/verdicts.ts` — existing verdict taxonomy and evidence payload shape
- `src/services/snapshot-rebuilder.ts` and `src/services/story-boundary-query.ts` — boundary reconstruction and fact-query flow for character checks
- `src/storage/repositories/rule-repository.ts` and `src/storage/repositories/verdict-repository.ts` — current persistence seams for rules and verdicts
- `.planning/phases/01-canonical-narrative-schema/01-02-SUMMARY.md` and `.planning/phases/01-canonical-narrative-schema/01-03-SUMMARY.md` — actual upstream implementation patterns from Phase 1

### Secondary (MEDIUM confidence)
- `.planning/PROJECT.md` and `.planning/REQUIREMENTS.md` — project-level explainability and hard-engine requirement framing
- `src/storage/migrations/0001_canonical_core.sql` — operational schema limits and current rule/verdict storage shape

### Tertiary (LOW confidence - needs validation)
- None. This research pass stayed inside locked project artifacts and the live codebase.
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: deterministic hard-constraint checking in a TypeScript + Zod codebase
- Ecosystem: current repo storage/services layer, checker module layout, verdict evidence structure
- Patterns: rule activation, checker family isolation, representative verdict aggregation
- Pitfalls: scope targeting, short-circuit explainability, character overreach, causal over-inference

**Confidence breakdown:**
- Standard stack: HIGH - reuses the current project stack without introducing speculative dependencies
- Architecture: HIGH - directly grounded in the existing codebase and locked Phase 2 decisions
- Pitfalls: HIGH - derived from concrete model gaps in live source files
- Code examples: MEDIUM - implementation sketches are project-aligned recommendations, not copied from finished engine code

**Research date:** 2026-04-09
**Valid until:** 2026-05-09
</metadata>

---

*Phase: 02-hard-constraint-engine*
*Research completed: 2026-04-09*
*Ready for planning: yes*
