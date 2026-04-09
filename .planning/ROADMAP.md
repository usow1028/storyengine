# Roadmap: StoryGraph

## Overview

StoryGraph starts by formalizing narrative into explicit characters, states, events, and world rules, then builds a deterministic consistency engine on top of that model. The roadmap intentionally puts data modeling and hard logical checks ahead of ingestion polish or visualization so the project’s first milestone produces a trustworthy judgment core rather than a visually impressive but shallow tool.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Canonical Narrative Schema** - Define the engine’s core data model for characters, states, events, world rules, and provenance
- [ ] **Phase 2: Hard Constraint Engine** - Encode and execute deterministic checks for physical, temporal, causal, and character-state consistency
- [ ] **Phase 3: Evidence and Repair Reasoning** - Explain verdicts and compute minimal repairs for broken story paths
- [ ] **Phase 4: Corpus Priors and Soft Pattern Layer** - Add pattern-backed soft drift signals and repair ranking without weakening hard logic
- [ ] **Phase 5: Natural-Language Ingestion and Review API** - Let writers submit prose-like input and review structured interpretations before checking
- [ ] **Phase 6: Interactive Inspection Surface** - Provide timeline/graph and structured views for exploring verdicts and repairs

## Phase Details

### Phase 1: Canonical Narrative Schema
**Goal**: Establish the canonical story model and persistence layer the rest of the engine depends on
**Depends on**: Nothing (first phase)
**Requirements**: [MODEL-01, MODEL-02, MODEL-03, MODEL-04, DATA-01]
**UI hint**: no
**Success Criteria** (what must be TRUE):
  1. A story can be stored as explicit characters, states, events, and world rules instead of prose-only blobs
  2. Event boundaries preserve reconstructable state before and after each event
  3. The system can answer where a character is, what they know, and what they want at a chosen story boundary
  4. Story revisions and rule versions are stored with provenance
**Plans**: 3 plans

Plans:
- [x] 01-01: Define canonical schemas, stable IDs, and violation taxonomies
- [x] 01-02: Implement story, rule, verdict, and provenance storage model
- [ ] 01-03: Build state snapshot/delta reconstruction baseline

### Phase 2: Hard Constraint Engine
**Goal**: Turn the canonical model into deterministic verdicts for impossible or contradictory story paths
**Depends on**: Phase 1
**Requirements**: [RULE-01, RULE-02, RULE-03, RULE-04, VERD-01]
**UI hint**: no
**Success Criteria** (what must be TRUE):
  1. The engine can flag physical, spatial, and temporal impossibilities between events
  2. The engine can identify missing or contradictory causal links for major outcomes
  3. The engine can detect unexplained character-state reversals using stored motives, loyalties, knowledge, and constraints
  4. Reality-default and user-authored rule overrides affect verdicts deterministically
**Plans**: 3 plans

Plans:
- [ ] 02-01: Encode hard-rule families for time, space, physics, causality, and character state
- [ ] 02-02: Integrate the primary symbolic solver and executable rule pack
- [ ] 02-03: Build deterministic verdict classification fixtures and regression tests

### Phase 3: Evidence and Repair Reasoning
**Goal**: Make verdicts explainable and revision-oriented instead of opaque failure labels
**Depends on**: Phase 2
**Requirements**: [VERD-02, VERD-03, REPR-01, REPR-02]
**UI hint**: no
**Success Criteria** (what must be TRUE):
  1. Every failing verdict cites the exact events, states, and rules that produced it
  2. The engine can suggest missing assumptions, prior events, or rule declarations that would restore coherence
  3. Repair candidates are ranked separately from the current validity verdict
  4. Story updates can be rechecked and compared against prior verdict runs
**Plans**: 3 plans

Plans:
- [ ] 03-01: Implement evidence/provenance trace objects for verdict explanation
- [ ] 03-02: Build minimal repair generation for missing assumptions and prior events
- [ ] 03-03: Add rerun and verdict-diff support for revised stories

### Phase 4: Corpus Priors and Soft Pattern Layer
**Goal**: Add pattern-backed soft reasoning without collapsing it into hard law
**Depends on**: Phase 3
**Requirements**: [SOFT-01, DATA-02]
**UI hint**: no
**Success Criteria** (what must be TRUE):
  1. The system can extract reusable event/state patterns from a corpus into an offline analytics store
  2. Soft priors can flag likely drift or weak explanations without producing hard contradictions
  3. Repair suggestions can be ranked by plausibility using pattern evidence
**Plans**: 2 plans

Plans:
- [ ] 04-01: Build corpus ingestion pipeline and derived event/state datasets
- [ ] 04-02: Implement soft-prior scoring and repair ranking layer

### Phase 5: Natural-Language Ingestion and Review API
**Goal**: Let writers work in natural language while preserving a structured reasoning core
**Depends on**: Phase 4
**Requirements**: [FLOW-01, FLOW-03]
**UI hint**: no
**Success Criteria** (what must be TRUE):
  1. A user can submit synopsis or scene text and receive a structured interpretation of events, states, and rule assumptions
  2. The user can correct extracted structure before the engine treats it as canonical
  3. The user can run checks on demand instead of being forced into realtime verdicts
**Plans**: 2 plans

Plans:
- [ ] 05-01: Build natural-language extraction and schema-validation pipeline
- [ ] 05-02: Implement correction loop and check-mode controls

### Phase 6: Interactive Inspection Surface
**Goal**: Make violations, repairs, and state transitions explorable without reading raw storage records
**Depends on**: Phase 5
**Requirements**: [FLOW-02]
**UI hint**: yes
**Success Criteria** (what must be TRUE):
  1. A user can inspect verdicts in structured lists grouped by contradiction type
  2. A user can trace linked events, states, and world rules on a timeline or graph view
  3. The interface visually distinguishes `Hard Contradiction`, `Repairable Gap`, and `Soft Drift`
**Plans**: 2 plans

Plans:
- [ ] 06-01: Build verdict explorer and structured review views
- [ ] 06-02: Add linked timeline/graph inspection for narrative state and violations

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Canonical Narrative Schema | 0/3 | Not started | - |
| 2. Hard Constraint Engine | 0/3 | Not started | - |
| 3. Evidence and Repair Reasoning | 0/3 | Not started | - |
| 4. Corpus Priors and Soft Pattern Layer | 0/2 | Not started | - |
| 5. Natural-Language Ingestion and Review API | 0/2 | Not started | - |
| 6. Interactive Inspection Surface | 0/2 | Not started | - |
