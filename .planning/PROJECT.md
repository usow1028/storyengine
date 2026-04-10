# StoryGraph

## What This Is

StoryGraph is a story-consistency engine project that treats narrative as a system that can be modeled, checked, and repaired rather than a purely intuitive writing act. Its first goal is not style generation, but an explainable consistency core that represents character state, events, and world rules, then evaluates whether a story remains causally, physically, temporally, and behaviorally coherent.

The project is for writers, aspiring writers, and narrative-system builders who want to inspect story structure in a way that resembles engineering analysis. It assumes that many narrative failures can be expressed as pattern mismatches, missing causes, broken state transitions, or undeclared world-rule exceptions.

## Core Value

Writers must be able to see exactly why a story is coherent or incoherent, and what explanation or prior condition would repair it.

## Requirements

### Validated

- v1.0 validated the explainable consistency core: canonical story modeling, deterministic hard checks, evidence-backed verdicts, repair reasoning, corpus-derived soft priors, natural-language review/check workflow, and browser inspection surface.
- Phase 07 validated that corpus-derived soft priors can surface as explainable advisory checked-output data without changing deterministic hard verdict truth.
- Phase 08 validated that consistency results can be inspected in a structured browser analysis view with verdict triage, deterministic evidence, event timeline, trace fields, repair suggestions, and advisory prior boundaries before advanced visualization is added.

### Active

- [ ] Define the next milestone requirements with `/gsd-new-milestone`.
- [ ] Decide whether v1.1 should prioritize full-draft ingestion, collaboration, format packs, or deeper inspection workflows.

### Out of Scope

- Automatic prose beautification or literary style scoring — the current focus is structural consistency, not sentence quality.
- Full autonomous story writing without explicit consistency inspection — generation can assist later, but it is not the core value.
- Screenplay, play, or novel export tooling — output-format specialization comes after the consistency core exists.
- 2D/3D visualization-first delivery — visualization is useful, but only after the underlying logic is trustworthy.

## Context

The project starts from the belief that story creation can be approached mathematically and engineerably. The user sees narrative as built from long-stabilized archetypes and patterns, and wants a system that can evaluate whether a story follows coherent causal flow rather than relying only on author intuition.

Current writing workflows usually spread ideas, setting notes, scenes, and plot structure across word processors or loose documents. That makes structural validation difficult. StoryGraph now has a v1.0 consistency core that can persist canonical story graphs, run deterministic verdict checks, propose and rank repairs, surface soft-prior advisory signals, accept natural-language reviewed input, and inspect verdict runs through a browser surface.

The next priority should be selected deliberately as a new milestone rather than extending v1.0 in place. Candidate directions include chapter-scale ingestion, collaboration/reviewer workflows, export/format packs, and richer inspection or visualization on top of the verified analysis core.

## Current State

v1.0 MVP shipped on 2026-04-10.

Delivered:
- Canonical TypeScript/Zod story model and PostgreSQL-style persistence with pg-mem verification.
- Deterministic hard constraint engine for physical, temporal, causal, and character-state contradictions.
- Evidence, repair, rerun, and verdict-diff reasoning.
- Offline corpus prior build pipeline plus soft-prior advisory runtime integration.
- Natural-language submit/review/approve/check workflow.
- Structured browser inspection console for verdict triage, evidence, timeline, trace, repair, and advisory review.

Verification:
- v1.0 milestone audit: passed.
- Requirements: 19/19 v1 requirements satisfied.
- Automated checks at milestone close: `npm run test`, `npm run build`, and `npm run test:browser` passed.

## Next Milestone Goals

- Choose the v1.1 product direction with `/gsd-new-milestone`.
- Keep deterministic verdict truth separate from advisory priors in any new workflow.
- Preserve explainable evidence and repair traceability as the core acceptance standard.

## Constraints

- **Explainability**: Every judgment must be traceable to explicit states, events, rules, or missing assumptions — black-box scoring is insufficient.
- **Default Physics**: The baseline world model follows real-world physical constraints unless user-defined world rules extend or override them.
- **Hybrid Architecture**: Frontier LLMs may assist with extraction, interpretation, and repair suggestions, but deterministic consistency judgment must remain logic-led.
- **Progressive Input**: Users should be able to write freely in natural language, but the engine must normalize that input into structured internal representations.
- **Phased Scope**: The first milestone should prioritize rule systems, schemas, taxonomies, and a working consistency core before ambitious UI or visualization work.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use `character state + event + world rule` as the minimum reasoning unit | Story inconsistency is not visible from events alone; character disposition, knowledge, goals, and world constraints must be present to judge coherence | ✓ Validated in v1.0 |
| Default to real-world physics with optional user rules | Most stories should inherit intuitive constraints first, then selectively permit exceptions such as teleportation or supernatural movement | ✓ Validated in v1.0 |
| Treat consistency as a hybrid judgment problem | Hard contradictions, repairable gaps, and soft drifts require different reasoning layers instead of a single score | ✓ Validated in v1.0 |
| Prioritize logic-engine design before polished author UI | The core project risk is not presentation but whether the engine can judge and explain consistency correctly | ✓ Validated in v1.0 |
| Keep natural-language authoring separate from internal representation | Writers should not be forced to hand-author structured data, but the engine still needs structured states and rules internally | ✓ Validated in v1.0 |

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
*Last updated: 2026-04-10 after v1.0 milestone completion*
