# Phase 2: Hard Constraint Engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 02-hard-constraint-engine
**Areas discussed:** engine form, hard verdict threshold, rule precedence, character contradiction evidence, checker order, causal sufficiency, verdict synthesis, rule activation, evaluation scope, physics baseline data, character comparison horizon, not-evaluated handling, runtime substrate, verdict evidence shape, recheck strategy, rule-pack segmentation

---

## Engine Form

| Option | Description | Selected |
|--------|-------------|----------|
| Family-separated checkers | Separate time/space/physics/causality/character checkers with a shared verdict pipeline | ✓ |
| Single solver | Start with one symbolic solver for all hard rules | |
| Hybrid | Mixed checker modules plus solver path from the start | |

**User's choice:** Family-separated checkers  
**Notes:** Preferred for deterministic behavior, simpler debugging, and clear checker-family boundaries.

---

## Hard Verdict Threshold

| Option | Description | Selected |
|--------|-------------|----------|
| Always hard on current impossibility | Anything impossible from current data becomes hard failure immediately | |
| Direct conflict only | Hard failure only when canonical state or active rules are directly contradicted | ✓ |
| Genre/world dependent | Let hard threshold vary by world/genre | |

**User's choice:** Direct conflict only  
**Notes:** Missing setup or missing explanation should remain repairable so later repair logic can work.

---

## Rule Precedence

| Option | Description | Selected |
|--------|-------------|----------|
| Specificity only | More specific scope always wins | |
| Priority only | Numeric priority fully determines winner | |
| Fixed scope + same-scope priority | Use fixed scope precedence and numeric priority only inside one scope level | ✓ |

**User's choice:** Fixed scope + same-scope priority  
**Notes:** Keeps overrides deterministic without making user-supplied priority values globally brittle.

---

## Character Contradiction Evidence

| Option | Description | Selected |
|--------|-------------|----------|
| Action vs trait only | Compare action against broad character image | |
| Action + prior state + no counter-motive | Use prior state and absence of justification | |
| Action + prior state + no counter-motive + repair candidate search | Separate direct contradiction from missing justification | ✓ |

**User's choice:** Action + prior state + no counter-motive + repair candidate search  
**Notes:** Betrayal-like cases must check for threats, obligations, or new knowledge before hard escalation.

---

## Checker Execution Order

| Option | Description | Selected |
|--------|-------------|----------|
| Evaluate all always | Run every checker even after early hard failures | |
| Foundational first + partial short-circuit | Prioritize foundational checks and stop dependent checks when assumptions collapse | ✓ |
| Fixed order without short-circuit | Keep order but never skip later checks | |

**User's choice:** Foundational first + partial short-circuit  
**Notes:** Upstream impossibility should be able to suppress dependent analyses while still recording skipped checks.

---

## Causal Sufficiency

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit causal links only | Only declared links count as sufficient cause | |
| Links first, canonical support signals allowed | Use links as strongest evidence, but accept preconditions/effects/time/state changes as limited support | ✓ |
| Implicit LLM causality | Let freer interpretation establish cause | |

**User's choice:** Links first, canonical support signals allowed  
**Notes:** Phase 2 remains canonical-structure-led rather than interpretation-led.

---

## Verdict Synthesis

| Option | Description | Selected |
|--------|-------------|----------|
| Parallel verdicts | Present all checker verdicts equally | |
| Representative verdict + supporting findings | One primary verdict plus supporting violations | ✓ |
| Checker-only outputs | No final synthesis | |

**User's choice:** Representative verdict + supporting findings  
**Notes:** The hard engine should remain legible and severity-ordered.

---

## Rule Activation

| Option | Description | Selected |
|--------|-------------|----------|
| Declaration implies activation | Once declared, rules are active everywhere they could apply | |
| Everything requires explicit activation | No rule is active unless explicitly turned on | |
| Baselines active, exceptions explicit | Baseline defaults start active; local/exception rules need explicit activation | ✓ |

**User's choice:** Baselines active, exceptions explicit  
**Notes:** Reality-default should behave like the ambient contract, while exceptional rules stay explicit.

---

## Evaluation Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Adjacent pairs only | Default everything to neighboring event comparisons | |
| Mixed scope by checker family | Use pair/path/revision scopes depending on checker type | ✓ |
| Whole revision always | Always inspect the full graph | |

**User's choice:** Mixed scope by checker family  
**Notes:** Time/space/physics stay local, causality follows paths, aggregate checks may inspect full revisions.

---

## Physics Baseline Data

| Option | Description | Selected |
|--------|-------------|----------|
| Place hierarchy + minTravelMinutes + simple movement | Use canonical movement constraints already present in the model | ✓ |
| Add transport profiles | Model travel modes such as plane/train/car | |
| Use external map data | Depend on distance/map integrations | |

**User's choice:** Place hierarchy + minTravelMinutes + simple movement  
**Notes:** Transport realism beyond that is deferred and handled by later rule sophistication or explicit overrides.

---

## Character Comparison Horizon

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate prior boundary only | Compare action against the latest state only | |
| Immediate prior first, extend relevant lineage | Use local comparison plus longer history for important axes | ✓ |
| Full history always | Always read the complete state lineage | |

**User's choice:** Immediate prior first, extend relevant lineage  
**Notes:** Loyalty, knowledge, goals, conditions, and obligations need selective long-range tracking.

---

## Not-Evaluated Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Hide skipped checks | Do not expose them in results | |
| Record secondary state | Keep explicit not-evaluated metadata in the result | ✓ |
| Full dependency chain object | Model skipped state as a separate trace structure | |

**User's choice:** Record secondary state  
**Notes:** The user wants explainability even when checks are skipped due to upstream contradictions.

---

## Runtime Substrate

| Option | Description | Selected |
|--------|-------------|----------|
| TypeScript checker runtime | Implement hard constraints as TypeScript predicate/checker modules | ✓ |
| ASP/solver runtime | Start directly with symbolic solver execution | |
| Hybrid runtime | Use TS plus solver adapter from the start | |

**User's choice:** TypeScript checker runtime  
**Notes:** This matches the existing codebase and keeps Phase 2 practical.

---

## Verdict Evidence Shape

| Option | Description | Selected |
|--------|-------------|----------|
| IDs only | Store only canonical identifiers | |
| IDs + reason code + short explanation | Structured evidence without a full proof trace | ✓ |
| Proof trace | Include trace-style derivation output | |

**User's choice:** IDs + reason code + short explanation  
**Notes:** Phase 2 should already be explainable, but not overbuilt for formal proofs.

---

## Recheck Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Always full recheck | Re-evaluate everything after every revision change | |
| Full recheck now, incremental later | Keep Phase 2 simple and defer impact-scoped reruns | ✓ |
| Incremental from the start | Implement change-scoped reruns immediately | |

**User's choice:** Full recheck now, incremental later  
**Notes:** Correctness and predictable behavior matter more than optimization in the first hard-engine pass.

---

## Rule-Pack Segmentation

| Option | Description | Selected |
|--------|-------------|----------|
| Family-based packs | Split rule packs into time/space/physics/causality/character groups | ✓ |
| One monolithic hard pack | Keep all hard rules in one package | |
| Baseline plus genre/world packs | Model pack hierarchy more aggressively from the start | |

**User's choice:** Family-based packs  
**Notes:** The user preferred rule-pack boundaries that match checker-family boundaries for testing and reasoning clarity.

---

## the agent's Discretion

- Exact reason-code names
- Internal helper structure for verdict aggregation
- Concrete TypeScript module boundaries between checker families
- Internal format for not-evaluated metadata

## Deferred Ideas

- Solver-first execution substrate
- Transport-mode modeling and external map data
- Incremental impact-scoped rechecks
- Full proof-trace verdict outputs
