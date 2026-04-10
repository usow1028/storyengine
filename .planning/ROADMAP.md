# Roadmap: StoryGraph

## Overview

StoryGraph starts by formalizing narrative into explicit characters, states, events, and world rules, then builds a deterministic consistency engine on top of that model. The roadmap intentionally puts data modeling and hard logical checks ahead of ingestion polish or visualization so the project’s first milestone produces a trustworthy judgment core rather than a visually impressive but shallow tool.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Canonical Narrative Schema** - Define the engine’s core data model for characters, states, events, world rules, and provenance
- [x] **Phase 2: Hard Constraint Engine** - Encode and execute deterministic checks for physical, temporal, causal, and character-state consistency
- [x] **Phase 3: Evidence and Repair Reasoning** - Explain verdicts and compute minimal repairs for broken story paths
- [x] **Phase 4: Corpus Priors and Soft Pattern Layer** - Add pattern-backed soft drift signals and repair ranking without weakening hard logic
- [x] **Phase 5: Natural-Language Ingestion and Review API** - Let writers submit prose-like input and review structured interpretations before checking
- [x] **Phase 6: Verification and Traceability Closure** - Backfill phase verification artifacts and reconcile requirement traceability for completed milestone work
- [x] **Phase 7: Soft-Prior Runtime Integration** - Wire advisory prior scoring into the checked runtime path without collapsing hard and soft judgments
- [ ] **Phase 8: Interactive Inspection Surface** - Provide timeline/graph and structured views for exploring verdicts and repairs

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
- [x] 01-03: Build state snapshot/delta reconstruction baseline

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
- [x] 02-01: Encode hard-rule families for time, space, physics, causality, and character state
- [x] 02-02: Integrate the primary symbolic solver and executable rule pack
- [x] 02-03: Build deterministic verdict classification fixtures and regression tests

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
- [x] 03-01: Implement evidence/provenance trace objects for verdict explanation
- [x] 03-02: Build minimal repair generation for missing assumptions and prior events
- [x] 03-03: Add rerun and verdict-diff support for revised stories

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
- [x] 04-01: Build corpus ingestion pipeline and derived event/state datasets
- [x] 04-02: Implement soft-prior scoring and repair ranking layer

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
- [x] 05-01: Build natural-language extraction and schema-validation pipeline
- [x] 05-02: Implement correction loop and check-mode controls

### Phase 6: Verification and Traceability Closure
**Goal**: Close milestone audit blockers by backfilling per-phase verification artifacts and aligning requirement traceability with implemented evidence
**Depends on**: Phase 5
**Requirements**: [MODEL-01, MODEL-02, MODEL-03, MODEL-04, DATA-01, RULE-01, RULE-02, RULE-03, RULE-04, VERD-01, VERD-02, VERD-03, REPR-01, REPR-02, DATA-02, FLOW-01, FLOW-03]
**Gap Closure**: Closes milestone audit requirement orphaning and missing phase verification artifacts
**UI hint**: no
**Success Criteria** (what must be TRUE):
  1. Phases 01-05 each have `VERIFICATION.md` artifacts with explicit requirement-to-evidence mapping
  2. `REQUIREMENTS.md` traceability matches the phase verification results for all implemented milestone requirements
  3. Milestone audit can classify phases 01-05 from verification artifacts instead of summary-only evidence
**Plans**: 3 plans

Plans:
- [x] 06-01: Backfill verification artifacts for phases 01-03
- [x] 06-02: Backfill verification artifacts for phases 04-05 and reconcile traceability evidence
- [x] 06-03: Re-run milestone audit and close verification-driven blockers

### Phase 7: Soft-Prior Runtime Integration
**Goal**: Surface phase 04 advisory priors in checked outputs while preserving deterministic hard verdict truth
**Depends on**: Phases 4 and 5
**Requirements**: [SOFT-01]
**Gap Closure**: Closes the missing phase 04 -> phase 05 runtime integration and broken soft-drift-informed check flow
**UI hint**: no
**Success Criteria** (what must be TRUE):
  1. On-demand checking can compute and return soft-prior assessments alongside deterministic hard verdict output
  2. Soft prior evidence remains explainable and advisory, including dominant layer, representative pattern summary, and repair plausibility adjustments
  3. End-to-end tests prove the ingestion review/check flow exposes soft prior results without mutating hard verdict classification
**Plans**: 3 plans

Plans:
- [x] 07-01: Integrate prior snapshot loading and advisory evaluation into checked runtime services
- [x] 07-02: Extend checked-output contracts and APIs with explainable soft-prior results
- [x] 07-03: Add cross-phase E2E regressions for soft-prior-informed check flows

### Phase 8: Interactive Inspection Surface
**Goal**: Make violations, repairs, and state transitions explorable without reading raw storage records
**Depends on**: Phase 7
**Requirements**: [FLOW-02]
**UI hint**: yes
**Success Criteria** (what must be TRUE):
  1. A user can inspect verdicts in structured lists grouped by contradiction type
  2. A user can trace linked events, states, and world rules on a timeline or graph view
  3. The interface visually distinguishes `Hard Contradiction`, `Repairable Gap`, and `Soft Drift`
**Plans**: 6 plans

Plans:
- [x] 08-01: Add UI build tooling and minimal inspection shell
- [x] 08-02: Persist sanitized inspection snapshots for verdict runs
- [x] 08-03: Build run-scoped inspection payload service and API route
- [x] 08-04: Build split-view verdict triage and detail UI
- [x] 08-05: Add evidence timeline, structured trace, and advisory UI
- [x] 08-06: Serve the inspection shell and verify browser behavior

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Canonical Narrative Schema | 3/3 | Complete | 2026-04-09 |
| 2. Hard Constraint Engine | 3/3 | Complete | 2026-04-09 |
| 3. Evidence and Repair Reasoning | 3/3 | Complete | 2026-04-09 |
| 4. Corpus Priors and Soft Pattern Layer | 2/2 | Complete | 2026-04-10 |
| 5. Natural-Language Ingestion and Review API | 2/2 | Complete | 2026-04-10 |
| 6. Verification and Traceability Closure | 3/3 | Complete | 2026-04-10 |
| 7. Soft-Prior Runtime Integration | 3/3 | Complete | 2026-04-10 |
| 8. Interactive Inspection Surface | 6/6 | Complete | 2026-04-10 |
