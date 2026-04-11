# Roadmap: StoryGraph

## Overview

StoryGraph v1.1 extends the shipped v1.0 consistency core from scene-level reviewed input to chapter-scale draft analysis. The milestone focuses on draft containers, deterministic segmentation, incremental review, scoped checks, revision diffing, and larger-run inspection while preserving the project constraints that made v1.0 trustworthy: deterministic verdict truth, explicit provenance, and advisory-only soft priors.

## Milestones

- [x] **v1.0 MVP** — Phases 1-8 shipped 2026-04-10. See [v1.0 roadmap archive](milestones/v1.0-ROADMAP.md), [v1.0 requirements archive](milestones/v1.0-REQUIREMENTS.md), and [v1.0 audit](milestones/v1.0-MILESTONE-AUDIT.md).
- [ ] **v1.1 Draft Scale** — Active milestone. Phases 9-12 plan chapter-scale draft ingestion, incremental review resilience, scoped checking, revision diffing, and large-run inspection.

## Phases

**Phase Numbering:**
- Integer phases (9, 10, 11, 12): Planned v1.1 milestone work
- Decimal phases (10.1, 10.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 9: Draft Container and Segment Scope Model** - Add document, revision, segment hierarchy, and check-scope contracts for chapter-scale drafts
- [ ] **Phase 10: Incremental Extraction and Review Resilience** - Make extraction, retry, correction, and approval safe across many draft segments
- [ ] **Phase 11: Scoped Checks and Revision Diff** - Run checks over explicit approved scope and compare verdict changes across runs or revisions
- [ ] **Phase 12: Large-Run Inspection and Operational Guardrails** - Keep larger draft analysis inspectable, filterable, traceable, and resumable

## Phase Details

### Phase 9: Draft Container and Segment Scope Model
**Goal**: Establish the draft-scale data model that lets chapter-sized input remain ordered, scoped, and traceable
**Depends on**: v1.0 Phase 5 ingestion/review API and Phase 8 inspection contracts
**Requirements**: [DRAFT-01, DRAFT-03]
**UI hint**: no
**Success Criteria** (what must be TRUE):
  1. A submitted draft can be represented as a stable document/revision/chapter/segment structure
  2. Segment labels, sequence, source offsets, and source text references survive API serialization and storage round trips
  3. Check scope can be represented as a first-class domain contract before check execution is implemented
  4. Existing single-chunk and full-draft ingestion behavior remains backward-compatible
**Plans**: 3 plans

Plans:
- [x] 09-01: Define draft document, revision, segment hierarchy, and scope schemas
- [x] 09-02: Persist draft containers, revision lineage, segment metadata, and scope records
- [ ] 09-03: Extend submit/read contracts and segmentation fixtures for chapter-scale drafts

### Phase 10: Incremental Extraction and Review Resilience
**Goal**: Let writers extract, retry, review, correct, and approve draft segments independently without corrupting canonical state
**Depends on**: Phase 9
**Requirements**: [DRAFT-01, DRAFT-04, REVIEW-01, REVIEW-02, OPER-01]
**UI hint**: no
**Success Criteria** (what must be TRUE):
  1. Extraction can target selected segments and record per-segment success or failure state
  2. Failed or stale segments can be retried without overwriting approved segments
  3. Segment approvals remain idempotent and provenance-backed
  4. Partial approval state blocks unsafe full-scope checks while still allowing explicit approved-scope progress
**Plans**: 3 plans

Plans:
- [ ] 10-01: Add selected segment extraction, retry state, and failure reporting
- [ ] 10-02: Harden partial review, correction, and canonical promotion guardrails
- [ ] 10-03: Add multi-segment lifecycle tests for extraction, retry, partial approval, and provenance

### Phase 11: Scoped Checks and Revision Diff
**Goal**: Run deterministic checks over explicit approved draft scope and compare consistency changes across revisions or runs
**Depends on**: Phase 10
**Requirements**: [DRAFT-02, CHECK-01, DIFF-01, TRACE-01]
**UI hint**: no
**Success Criteria** (what must be TRUE):
  1. Check requests validate that selected scope is approved and resolvable to canonical story data
  2. Verdict runs persist scope metadata without changing deterministic hard verdict classification
  3. Revision or run diffs classify added, resolved, persisted, and changed findings with scope labels
  4. Soft-prior advisories remain separate from hard verdict truth in scoped checks
**Plans**: 3 plans

Plans:
- [ ] 11-01: Add approved-scope validation and scoped verdict run metadata
- [ ] 11-02: Extend verdict diffing with revision and scope-aware labels
- [ ] 11-03: Add scoped check and revision comparison API/service regressions

### Phase 12: Large-Run Inspection and Operational Guardrails
**Goal**: Make chapter-scale check results usable in the browser inspection surface and operationally honest when work is partial
**Depends on**: Phase 11
**Requirements**: [DRAFT-03, INSPECT-01, TRACE-01, OPER-01, REVIEW-02]
**UI hint**: yes
**Success Criteria** (what must be TRUE):
  1. Inspection payloads expose scope summary, segment/chapter grouping, source spans, and review-state counts
  2. The browser inspection surface can filter or group larger verdict sets without losing fixed verdict-kind triage
  3. Partial failures and unresolved review state are visible in API/UI output
  4. Milestone verification proves draft-scale flows remain deterministic, traceable, and advisory-prior-safe
**Plans**: 3 plans

Plans:
- [ ] 12-01: Extend inspection payloads with draft scope, source spans, grouping, and progress summaries
- [ ] 12-02: Add large-run filtering and grouping to the browser inspection surface
- [ ] 12-03: Add operational guardrail tests and v1.1 milestone verification artifacts

## Progress

**Execution Order:**
Phases execute in numeric order: 9 → 10 → 11 → 12

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 9. Draft Container and Segment Scope Model | 0/3 | Planned | - |
| 10. Incremental Extraction and Review Resilience | 0/3 | Planned | - |
| 11. Scoped Checks and Revision Diff | 0/3 | Planned | - |
| 12. Large-Run Inspection and Operational Guardrails | 0/3 | Planned | - |
