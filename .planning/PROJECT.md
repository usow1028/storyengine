# StoryGraph

## What This Is

StoryGraph is a story-consistency engine project that treats narrative as a system that can be modeled, checked, and repaired rather than a purely intuitive writing act. Its first goal is not style generation, but an explainable consistency core that represents character state, events, and world rules, then evaluates whether a story remains causally, physically, temporally, and behaviorally coherent.

The project is for writers, aspiring writers, and narrative-system builders who want to inspect story structure in a way that resembles engineering analysis. It assumes that many narrative failures can be expressed as pattern mismatches, missing causes, broken state transitions, or undeclared world-rule exceptions.

## Core Value

Writers must be able to see exactly why a story is coherent or incoherent, and what explanation or prior condition would repair it.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Model story state with explicit character state, event, and world-rule representations.
- [ ] Detect hard contradictions in causality, time, space, physical possibility, and character behavior.
- [ ] Distinguish irrecoverable contradictions from repairable inconsistencies caused by missing justification.
- [ ] Support reality-first world rules with user-defined rule extensions or overrides.
- [ ] Produce explainable verdicts with evidence, violation types, and repair suggestions.
- [ ] Build the first version around logic design, rule taxonomies, and consistency-engine architecture before writer-facing UI expansion.

### Out of Scope

- Automatic prose beautification or literary style scoring — the current focus is structural consistency, not sentence quality.
- Full autonomous story writing without explicit consistency inspection — generation can assist later, but it is not the core value.
- Screenplay, play, or novel export tooling — output-format specialization comes after the consistency core exists.
- 2D/3D visualization-first delivery — visualization is useful, but only after the underlying logic is trustworthy.

## Context

The project starts from the belief that story creation can be approached mathematically and engineerably. The user sees narrative as built from long-stabilized archetypes and patterns, and wants a system that can evaluate whether a story follows coherent causal flow rather than relying only on author intuition.

Current writing workflows usually spread ideas, setting notes, scenes, and plot structure across word processors or loose documents. That makes structural validation difficult. This project instead centers a formal consistency engine that can inspect event chains, state transitions, motivations, and world assumptions.

The current priority is the engine logic itself: which formal theories should ground consistency judgment, how violations should be classified, what database structures should hold rules and evidence, and how repairable explanations should be represented. Natural-language authoring remains important, but only as an input layer over a structured internal model.

## Constraints

- **Explainability**: Every judgment must be traceable to explicit states, events, rules, or missing assumptions — black-box scoring is insufficient.
- **Default Physics**: The baseline world model follows real-world physical constraints unless user-defined world rules extend or override them.
- **Hybrid Architecture**: Frontier LLMs may assist with extraction, interpretation, and repair suggestions, but deterministic consistency judgment must remain logic-led.
- **Progressive Input**: Users should be able to write freely in natural language, but the engine must normalize that input into structured internal representations.
- **Phased Scope**: The first milestone should prioritize rule systems, schemas, taxonomies, and a working consistency core before ambitious UI or visualization work.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use `character state + event + world rule` as the minimum reasoning unit | Story inconsistency is not visible from events alone; character disposition, knowledge, goals, and world constraints must be present to judge coherence | — Pending |
| Default to real-world physics with optional user rules | Most stories should inherit intuitive constraints first, then selectively permit exceptions such as teleportation or supernatural movement | — Pending |
| Treat consistency as a hybrid judgment problem | Hard contradictions, repairable gaps, and soft drifts require different reasoning layers instead of a single score | — Pending |
| Prioritize logic-engine design before polished author UI | The core project risk is not presentation but whether the engine can judge and explain consistency correctly | — Pending |
| Keep natural-language authoring separate from internal representation | Writers should not be forced to hand-author structured data, but the engine still needs structured states and rules internally | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-09 after initialization*
