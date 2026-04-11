---
phase: 09-draft-container-and-segment-scope-model
verified: 2026-04-11T03:53:20Z
status: passed
score: 4/4 must-haves verified
gaps_found: 0
human_verification: 0
---

# Phase 9: Draft Container and Segment Scope Model Verification Report

**Phase Goal:** Establish the draft-scale data model that lets chapter-sized input remain ordered, scoped, and traceable  
**Verified:** 2026-04-11T03:53:20Z  
**Status:** passed  
**Re-verify needed:** No

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Submitted draft text is represented as an ordered document, revision, chapter/section, and segment structure. | ✓ VERIFIED | `src/domain/drafts.ts` defines document/revision/section/path/scope contracts, `planDraftSubmission()` emits deterministic document/revision/section/segment metadata, and `tests/services/natural-language-extraction.test.ts` plus `tests/api/ingestion-review-api.test.ts` verify chapter-scale outputs. |
| 2 | Segment labels, sequence, source offsets, and source text references survive storage and API serialization round trips. | ✓ VERIFIED | `src/storage/migrations/0005_draft_scope.sql` adds additive draft metadata columns/tables, `IngestionSessionRepository.loadSessionSnapshot()` returns persisted sections/scopes/source refs, and `tests/storage/ingestion-session-repository.test.ts` plus `tests/api/ingestion-review-api.test.ts` verify LF-normalized `sourceTextRef` persistence and API output. |
| 3 | Check scope exists as a first-class persisted contract before Phase 11 executes scoped checks. | ✓ VERIFIED | `DraftCheckScopeSchema` supports `full_approved_draft`, `section`, and `segment_range`; `saveDraftPlan()` persists scope payloads into `draft_check_scopes`; API responses serialize `scopes` additively without changing the existing check request contract. |
| 4 | Existing `chunk` and legacy `full_draft` ingestion behavior remains backward-compatible. | ✓ VERIFIED | `segmentSubmissionText()` still returns legacy `Chunk 1` output, `loadSessionSnapshot()` synthesizes compatibility draft IDs for legacy rows, and `tests/api/check-controls-api.test.ts` proves approved chunk checks still reach `workflowState: "checked"` with no request `scope` payload. |

**Score:** 4/4 truths verified

## Required Artifacts

| Artifact | Expected Role | Status | Details |
|----------|---------------|--------|---------|
| `src/domain/drafts.ts` | Draft-scale document, revision, section, path, source-ref, and scope contracts | ✓ EXISTS + SUBSTANTIVE | Exports all Phase 9 schema contracts and the draft submission plan shape. |
| `src/services/ingestion-session.ts` | Deterministic draft planning and submit persistence wiring | ✓ EXISTS + SUBSTANTIVE | Normalizes draft text, builds draft plans, and persists those plans before segment rows are written. |
| `src/storage/migrations/0005_draft_scope.sql` | Additive draft persistence schema | ✓ EXISTS + SUBSTANTIVE | Creates draft tables and nullable enrichment columns without dropping existing ingestion tables. |
| `src/storage/repositories/ingestion-session-repository.ts` | Draft-aware repository persistence and legacy synthesis | ✓ EXISTS + SUBSTANTIVE | Persists draft plans, loads sections/scopes/source refs, and synthesizes compatibility draft IDs when legacy rows lack stored metadata. |
| `src/api/schemas.ts` | Additive API request and response boundary | ✓ EXISTS + SUBSTANTIVE | Accepts nested draft metadata and serializes `draft`, `sections`, `scopes`, `draftPath`, and `sourceTextRef` additively. |
| `src/api/routes/ingestion-submit.ts` | HTTP route mapping for nested draft request data | ✓ EXISTS + SUBSTANTIVE | Maps nested `draft` inputs into the existing submit service without renaming legacy request fields. |
| `tests/domain/drafts.test.ts` | Domain validation regressions | ✓ EXISTS + SUBSTANTIVE | Covers supported scope kinds and LF-based source-ref validation. |
| `tests/storage/ingestion-session-repository.test.ts` | Storage round-trip and legacy compatibility proof | ✓ EXISTS + SUBSTANTIVE | Covers persisted draft containers, synthesized legacy metadata, and boundary/source-ref synchronization. |
| `tests/api/ingestion-review-api.test.ts` | Submit/read draft serialization proof | ✓ EXISTS + SUBSTANTIVE | Covers chapter-scale draft responses and legacy chunk compatibility. |
| `tests/api/check-controls-api.test.ts` | Backward-compatible check flow proof | ✓ EXISTS + SUBSTANTIVE | Confirms approved chunk checks still require no explicit scope payload. |

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/services/ingestion-session.ts` | `src/domain/drafts.ts` | `planDraftSubmission()` returns `DraftSubmissionPlanSchema.parse(...)` | ✓ WIRED | Draft planner output is validated against the shared domain contract before persistence. |
| `src/storage/repositories/ingestion-session-repository.ts` | `src/services/ingestion-session.ts` | `saveDraftPlan()` before `saveSegments()` | ✓ WIRED | Submit flow persists draft tables/scopes before segment rows, so the first read already includes draft metadata. |
| `src/api/schemas.ts` | `src/storage/repositories/ingestion-session-repository.ts` | `serializeIngestionSessionResponse()` maps snapshot draft sections/scopes/source refs | ✓ WIRED | API responses read persisted draft metadata instead of reconstructing it ad hoc. |
| `tests/storage/ingestion-session-repository.test.ts` | `src/storage/repositories/ingestion-session-repository.ts` | round-trip, legacy, and boundary-sync coverage | ✓ WIRED | Tests assert persisted and synthesized draft metadata on repository snapshots. |
| `tests/api/ingestion-review-api.test.ts` | `src/api/routes/ingestion-submit.ts` | Fastify `app.inject()` submit/read flow | ✓ WIRED | End-to-end draft submit/read responses are verified through the public API path. |

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| DRAFT-01 | ✓ SATISFIED | Chapter-scale inputs now emit ordered document/revision/section/segment metadata through the planner, repository snapshot, and API response surface. |
| DRAFT-03 | ✓ SATISFIED | Stable labels, order, LF-normalized offsets, and `sourceTextRef` survive persistence and API serialization, with regression coverage across service, storage, and API layers. |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript contract compile | `npm run typecheck` | `tsc --noEmit` exited 0 | PASS |
| Phase 9 ingestion regression suite | `npm run test:ingestion` | 5 files passed, 19 tests passed | PASS |
| Targeted API contract regression | `npm exec -- vitest run tests/api/ingestion-review-api.test.ts tests/api/check-controls-api.test.ts --bail=1` | 2 files passed, 8 tests passed | PASS |
| Targeted storage regression | `npm exec -- vitest run tests/storage/ingestion-session-repository.test.ts --bail=1` | 1 file passed, 5 tests passed | PASS |

## Anti-Patterns Found

None. No blocker, warning, or placeholder-only path was found in the Phase 9 production files. Scope execution remains intentionally absent from Phase 9 and is deferred by design to Phase 11.

## Human Verification Required

None. Phase 9 is a service/storage/API data-model phase with automated verification coverage across the affected paths.

## Gaps Summary

No goal-blocking gaps found. Phase 9 establishes the draft-scale data model, additive persistence, and API serialization required by the roadmap while preserving legacy ingestion and check behavior.

## Verification Metadata

**Verification approach:** Goal-backward from the Phase 9 roadmap goal and success criteria, cross-checked against all three plan summaries and the final automated gates.  
**Must-haves source:** `09-01-PLAN.md`, `09-02-PLAN.md`, `09-03-PLAN.md`, and the Phase 9 roadmap success criteria.  
**Automated checks:** `npm run typecheck`, `npm run test:ingestion`, targeted API/storage regressions.  
**Human checks required:** 0  
**Total verification time:** phase-close verification pass

---
*Verified: 2026-04-11T03:53:20Z*  
*Verifier: Codex*
