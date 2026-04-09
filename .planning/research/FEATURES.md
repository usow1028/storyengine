# Feature Research

**Domain:** story consistency engine / computational narrative reasoning
**Researched:** 2026-04-09
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Canonical event/state/world-rule model | Without an explicit model, consistency checks become hand-wavy | HIGH | The product needs normalized storage for characters, events, constraints, and state transitions |
| Hard consistency verdicts | Users expect the engine to say what is impossible, not just what feels weak | HIGH | Must cover time, space, causality, physical possibility, and character-state conflicts |
| Explainable evidence trace | Writers need to know exactly why a verdict happened | MEDIUM | Every violation should point to the relevant states, events, and rules |
| Repair suggestions | A useful engine should indicate how to make a broken story coherent | HIGH | This is where abductive reasoning becomes product value instead of raw diagnosis only |
| World-rule authoring | Realism-default alone is not enough for fantasy, SF, or alternate-history stories | MEDIUM | Users need an explicit way to add or override rules |
| Iterative re-check workflow | Writers revise stories repeatedly | MEDIUM | Verdicts must be rerunnable after edits without rebuilding everything from scratch |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Hybrid hard + soft reasoning | Separates true contradiction from soft narrative drift | HIGH | Stronger than tools that only offer vague critique |
| Minimal repair set generation | Shows the smallest explanation set needed to restore coherence | HIGH | Important for actionable revision rather than generic advice |
| Corpus-backed priors | Learns common event and character patterns without turning them into laws | HIGH | Useful for soft warnings, repair ranking, and narrative pattern discovery |
| Automatic structure extraction from natural language | Lets writers keep freeform authoring while the engine stays structured inside | HIGH | Needs LLM extraction plus user correction loop |
| Timeline/graph inspection of narrative state | Makes abstract inconsistency visible | MEDIUM | Strong visualization value once the reasoning core is trustworthy |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| One global “story quality” score | Feels simple and marketable | Hides whether the problem is physics, motive, timing, or world rules | Use typed verdict classes plus optional derived score |
| Style-polishing as a core feature | Writers often ask for prose improvement | Distracts from the product’s main value and muddies evaluation with aesthetics | Keep style tooling separate from consistency reasoning |
| Fully autonomous story generation | Sounds impressive | Turns the engine into a general writing assistant instead of a reasoning system | Let generation remain a later, optional helper around the engine |
| Early 3D visualization | Feels innovative | Adds UI cost before the logic model is stable | Start with structured reports and 2D graph/timeline inspection |

## Feature Dependencies

```text
Canonical model
    └──requires──> rule schema
                       └──requires──> verdict taxonomy

Hard checker
    └──enables──> repair engine
                       └──enhanced by──> corpus priors

Natural-language ingestion
    └──requires──> canonical model

Visualization
    └──requires──> canonical model + violation store
```

### Dependency Notes

- **Repair engine requires hard checker:** you cannot suggest minimal repairs until the system can state what currently fails.
- **Natural-language ingestion requires canonical model:** extraction quality is impossible to validate if the target schema is unstable.
- **Corpus priors enhance repair ranking:** they help prioritize plausible fixes, but should not define logical validity.
- **Visualization depends on stored reasoning artifacts:** a graph view is only useful if it reflects explicit states, links, and violations.

## MVP Definition

### Launch With (v1)

- [ ] Canonical schema for characters, events, states, rules, and verdicts — required for every later layer
- [ ] Hard consistency checker — core product promise
- [ ] Typed violation taxonomy with evidence trace — required for explanation
- [ ] Minimal repair suggestion engine — turns diagnosis into revision support
- [ ] Reality-default plus user-authored world rules — required for domain flexibility

### Add After Validation (v1.x)

- [ ] Natural-language extraction with human correction loop — add once the canonical schema is stable
- [ ] Analyst-facing inspection UI — add once verdicts are trustworthy enough to visualize
- [ ] Similar-case retrieval from prior stories and examples — add once pattern DB exists

### Future Consideration (v2+)

- [ ] Full-manuscript ingestion across chapter-scale text — defer until extraction robustness improves
- [ ] Multi-user annotation and collaborative review — defer until the solo workflow is stable
- [ ] Format-specific packs for screenplays, plays, and novels — defer until generic consistency logic proves reusable

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Canonical narrative schema | HIGH | HIGH | P1 |
| Hard contradiction checker | HIGH | HIGH | P1 |
| Evidence-backed verdicts | HIGH | MEDIUM | P1 |
| Repair suggestion engine | HIGH | HIGH | P1 |
| World-rule editor | HIGH | MEDIUM | P1 |
| Natural-language auto-structuring | HIGH | HIGH | P2 |
| Corpus-backed priors | MEDIUM | HIGH | P2 |
| Visualization layer | MEDIUM | MEDIUM | P2 |
| Full-manuscript ingestion | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Competitor A | Competitor B | Our Approach |
|---------|--------------|--------------|--------------|
| Plot/timeline planning | Plotting tools often model events and chronology manually | Timeline tools focus on ordering, not formal consistency | Treat chronology as one layer inside a larger event-state-rule system |
| AI writing assistance | LLM tools generate or critique prose fluidly | They often lack deterministic state tracking | Keep LLMs for extraction and explanation, not the final verdict authority |
| Character tracking | Many tools rely on notes or manual profiles | Most do not check behavior against declared state and motive | Represent character state transitions explicitly and judge drift against them |
| World-building rules | Worldbuilding apps store lore | They rarely enforce those rules during plot evaluation | Store rules as executable constraints, not passive notes |

## Sources

- Plotting/timeline tool patterns across the writing-tool ecosystem
- https://arxiv.org/abs/2503.23512 — narrative consistency repair as an explicit product need
- https://arxiv.org/abs/2603.05890 — long-context story consistency taxonomy and checker framing
- https://arxiv.org/abs/2508.09848 — current limits of long-context consistency judgment

---
*Feature research for: story consistency engine*
*Researched: 2026-04-09*
