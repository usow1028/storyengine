# Requirements: StoryGraph v1.1 Draft Scale

**Defined:** 2026-04-10
**Milestone:** v1.1 Draft Scale
**Core Value:** Writers must be able to see exactly why a story is coherent or incoherent, and what explanation or prior condition would repair it.

## v1.1 Requirements

Requirements for scaling the verified v1.0 consistency loop from scene-level reviewed input to chapter-scale draft analysis.

### Draft Ingestion

- [x] **DRAFT-01**: User can submit chapter-scale draft text as an ordered document, chapter, and segment set instead of a single scene blob.
- [ ] **DRAFT-02**: Engine can compare consistency across multiple revisions of a longer draft.
- [x] **DRAFT-03**: System preserves stable segment labels, order, source offsets, and source text references from submission through inspection.
- [ ] **DRAFT-04**: System can extract, retry, and report status for selected draft segments independently.

### Review and Canonical Promotion

- [ ] **REVIEW-01**: User can approve safe segments while leaving uncertain or failed segments unresolved without corrupting canonical state.
- [ ] **REVIEW-02**: User can see which entities, events, state boundaries, causal links, and rules came from each draft segment before promotion.

### Scoped Checking and Diffing

- [ ] **CHECK-01**: User can run consistency checks against an explicit approved scope, including full approved draft, chapter, or segment range.
- [ ] **DIFF-01**: User can compare verdict output between runs or revisions with added, resolved, persisted, and changed findings labeled by scope.

### Inspection and Operations

- [ ] **INSPECT-01**: User can inspect larger draft-check runs through grouped and filterable verdict output without losing deterministic evidence.
- [ ] **TRACE-01**: Every verdict, repair, and diff item remains traceable to canonical IDs, rule IDs, and original draft source spans.
- [ ] **OPER-01**: Long-running or partially failed draft analysis reports resumable progress and failure state instead of appearing complete.

## Out of Scope

Explicitly excluded from v1.1.

| Feature | Reason |
|---------|--------|
| Multi-user collaboration | Reviewer permissions and conflict handling should follow after single-writer draft-scale state is reliable |
| Export or format packs | Novel/screenplay output formats are less important than preserving draft-scale reasoning correctness |
| Real-time editor integration | On-demand scoped checks are safer until batch extraction and review state are proven |
| Autonomous rewrite generation | The milestone should explain and compare coherence, not rewrite prose automatically |
| Style scoring | Structural consistency remains separate from prose quality |
| Heavy graph visualization | Grouping and filtering are the first large-run inspection need |
| External queue infrastructure | v1.1 can prove resumable state without adding a background queue dependency |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DRAFT-01 | Phase 9, Phase 10 | Validated in Phase 09 |
| DRAFT-02 | Phase 11 | Planned |
| DRAFT-03 | Phase 9, Phase 12 | Validated in Phase 09 |
| DRAFT-04 | Phase 10 | Planned |
| REVIEW-01 | Phase 10 | Planned |
| REVIEW-02 | Phase 10, Phase 12 | Planned |
| CHECK-01 | Phase 11 | Planned |
| DIFF-01 | Phase 11 | Planned |
| INSPECT-01 | Phase 12 | Planned |
| TRACE-01 | Phase 11, Phase 12 | Planned |
| OPER-01 | Phase 10, Phase 12 | Planned |

**Coverage:**
- v1.1 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0

---
*Requirements defined: 2026-04-10 for v1.1 Draft Scale*
