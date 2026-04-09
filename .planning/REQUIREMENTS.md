# Requirements: StoryGraph

**Defined:** 2026-04-09
**Core Value:** Writers must be able to see exactly why a story is coherent or incoherent, and what explanation or prior condition would repair it.

## v1 Requirements

Requirements for the initial consistency-engine release. Each maps to a roadmap phase.

### Canonical Modeling

- [ ] **MODEL-01**: User can represent characters, locations, objects, and world entities as explicit canonical records instead of prose-only notes
- [ ] **MODEL-02**: User can represent character state at story boundaries, including knowledge, goals, loyalties, resources, and location
- [ ] **MODEL-03**: User can represent events with actors, time, place, preconditions, effects, and causal links
- [ ] **MODEL-04**: User can declare world rules that define default physics and explicit exceptions

### Rule Engine

- [ ] **RULE-01**: Engine can detect physical impossibility between linked events
- [ ] **RULE-02**: Engine can detect temporal contradictions, including impossible travel or duration assumptions
- [ ] **RULE-03**: Engine can detect causal gaps where a major outcome lacks sufficient prior cause
- [ ] **RULE-04**: Engine can detect character-state contradictions such as motive collapse, knowledge mismatch, or unexplained loyalty reversal

### Verdicts

- [ ] **VERD-01**: Engine classifies results as `Hard Contradiction`, `Repairable Gap`, `Soft Drift`, or `Consistent`
- [ ] **VERD-02**: Each verdict cites the exact events, states, and rules used to reach the judgment
- [ ] **VERD-03**: Verdicts can be rerun against updated story versions so changes in consistency are inspectable

### Repair Logic

- [ ] **REPR-01**: Engine can propose missing assumptions, rule declarations, or prior events that would repair a failing story path
- [ ] **REPR-02**: Engine can rank repair candidates separately from hard validity so plausible fixes do not masquerade as current truth

### Pattern Priors

- [ ] **SOFT-01**: Engine can use corpus-derived narrative patterns as soft priors without promoting them to hard rules

### Data & Workflow

- [ ] **DATA-01**: System stores canonical story objects, rule packs, verdicts, and provenance in a queryable database
- [ ] **DATA-02**: System supports offline corpus extraction and analysis to build or revise soft priors
- [ ] **FLOW-01**: User can submit natural-language synopsis or scene text and receive a normalized structured interpretation for review
- [ ] **FLOW-02**: User can inspect consistency results in a structured analysis view before advanced visualization is added
- [ ] **FLOW-03**: User can run consistency checks on demand and is not forced into realtime verdicting while drafting

## v2 Requirements

Deferred to later releases. Tracked but not in the current roadmap.

### Full-Draft Ingestion

- **DRAFT-01**: User can analyze chapter-scale or manuscript-scale drafts with incremental extraction
- **DRAFT-02**: Engine can compare consistency across multiple revisions of a long work

### Collaboration

- **COLLAB-01**: Multiple reviewers can annotate the same story model without corrupting canonical state
- **COLLAB-02**: Team can compare disagreement between reviewer judgments and engine verdicts

### Format Packs

- **FORMAT-01**: User can apply format-specific rule packs for novels, plays, and screenplays
- **FORMAT-02**: User can export structured story analysis into downstream writing formats

## Out of Scope

Explicitly excluded from the first roadmap.

| Feature | Reason |
|---------|--------|
| Prose beautification | Structural consistency is the core value; sentence craft is a separate problem |
| Fully autonomous story generation | The product should judge and repair coherence first, not become a general writing assistant |
| 3D visualization | Visual novelty should not outrun reasoning accuracy |
| Format-specific screenplay/novel export | Specialization should follow a proven generic consistency core |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MODEL-01 | Phase 6 | Pending |
| MODEL-02 | Phase 6 | Pending |
| MODEL-03 | Phase 6 | Pending |
| MODEL-04 | Phase 6 | Pending |
| DATA-01 | Phase 6 | Pending |
| RULE-01 | Phase 6 | Pending |
| RULE-02 | Phase 6 | Pending |
| RULE-03 | Phase 6 | Pending |
| RULE-04 | Phase 6 | Pending |
| VERD-01 | Phase 6 | Pending |
| VERD-02 | Phase 6 | Pending |
| VERD-03 | Phase 6 | Pending |
| REPR-01 | Phase 6 | Pending |
| REPR-02 | Phase 6 | Pending |
| SOFT-01 | Phase 7 | Pending |
| DATA-02 | Phase 6 | Pending |
| FLOW-01 | Phase 6 | Pending |
| FLOW-03 | Phase 6 | Pending |
| FLOW-02 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-10 after milestone gap planning*
