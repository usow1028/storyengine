# Phase 1: Canonical Narrative Schema - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase defines the canonical representation and persistence model for StoryGraph. It covers how characters, states, events, world rules, and provenance are stored and reconstructed so later phases can run deterministic consistency checks on top of them. It does not add writer-facing analysis UI, full natural-language ingestion, or soft-prior scoring.

</domain>

<decisions>
## Implementation Decisions

### Event Modeling
- **D-01:** Canonical `Event` units are state-changing causal units rather than sentence-level fragments or coarse scene-only blocks.
- **D-02:** Abstract events are first-class canonical events when they produce state or rule changes. Examples include betrayal, confession, contract, oath, threat, decision, and identity reveal.
- **D-03:** An event must connect to at least one state change or rule change to qualify as a canonical event.

### Character State Schema
- **D-04:** `CharacterState` uses a hybrid structure: fixed core slots plus extensible typed attributes.
- **D-05:** Core slots exist to support deterministic checks across stories; special work-specific states are allowed through typed extensions rather than fully freeform graph properties.

### Temporal and Spatial Representation
- **D-06:** Time modeling is relative-order first, with absolute timestamps attached only when the source material actually supports them.
- **D-07:** Temporal relations should support at least `before`, `after`, `during`, `same-window`, and `unknown`, plus duration/minimum-travel constraints for contradiction checking.
- **D-08:** Space modeling uses place entities with containment hierarchies and optional coordinates or movement constraints.
- **D-09:** Movement plausibility should be judged from place hierarchy and minimum travel-time constraints, not from coordinates alone.

### Rule Representation
- **D-10:** Rule metadata lives in the operational database, including rule identity, description, scope, priority, activation state, and world affiliation.
- **D-11:** Executable hard rules live in versioned rule files outside the database so solver behavior remains explicit and auditable.
- **D-12:** User-authored world rules are allowed in free natural language, but must be normalized into a validated internal representation before the engine can execute them.

### Storage Strategy
- **D-13:** PostgreSQL is the canonical source of truth for operational story data, rule metadata, verdict records, and provenance.
- **D-14:** Graph-oriented exploration may be added later as a projection/read model, but not as the initial system of record.

### the agent's Discretion
- Exact naming of core state slots, so long as they preserve the fixed-core plus extension model
- Exact schema split between relational columns and `jsonb` extension payloads
- Specific rule-file layout and solver adapter structure, so long as DB metadata and executable rules remain separate

</decisions>

<specifics>
## Specific Ideas

- The user wants StoryGraph to treat story consistency as a mathematical and engineering problem rather than a purely intuitive craft process.
- Reality physics is the baseline world model, but alternate-world exceptions should be expressible without breaking the engine.
- The engine should not force writers to manually enter structured data first; internal structure exists for reasoning, even if authoring remains freer later.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Direction
- `.planning/PROJECT.md` — project purpose, non-negotiables, and key decisions about the reasoning unit and engine philosophy
- `.planning/REQUIREMENTS.md` — Phase 1 requirement coverage for canonical modeling and storage
- `.planning/ROADMAP.md` — fixed phase boundary, success criteria, and plan breakdown for Phase 1
- `.planning/research/SUMMARY.md` — recommended architecture ordering and rationale

### Supporting Research
- `.planning/research/STACK.md` — baseline stack recommendation including PostgreSQL, TypeScript, and symbolic reasoning tooling
- `.planning/research/ARCHITECTURE.md` — layered system architecture and storage/reasoning split
- `.planning/research/PITFALLS.md` — anti-patterns to avoid while defining the schema and rule system

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No product runtime code exists yet; this phase establishes the first canonical engine artifacts.

### Established Patterns
- Planning artifacts already assume a TypeScript-first, PostgreSQL-centered architecture with deterministic reasoning kept separate from UI concerns.
- Rule metadata and executable rule logic are intentionally separate concerns in the project research.

### Integration Points
- Phase 1 outputs must support Phase 2's hard-constraint solver, Phase 3's evidence and repair layer, and Phase 5's later natural-language normalization path.
- The schema should be designed so verdict provenance and story revisions can be persisted without migration-heavy redesign in later phases.

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---
*Phase: 01-canonical-narrative-schema*
*Context gathered: 2026-04-09*
