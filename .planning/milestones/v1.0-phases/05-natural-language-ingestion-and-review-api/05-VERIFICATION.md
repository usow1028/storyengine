---
phase: 05-natural-language-ingestion-and-review-api
verified: 2026-04-09T19:01:04Z
status: passed
score: 2/2 must-haves verified
---

# Phase 5: Natural-Language Ingestion and Review API Verification Report

**Phase Goal:** Let writers work in natural language while preserving a structured reasoning core
**Verified:** 2026-04-09T19:01:04Z
**Status:** passed

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Users can submit chunk or full-draft natural-language text and receive persisted, reviewable structured interpretation state instead of direct canonical writes. | ✓ VERIFIED | `tests/services/natural-language-extraction.test.ts` proves deterministic segmentation and `needs_review` routing, while `tests/api/ingestion-review-api.test.ts` proves `POST /api/ingestion/submissions` returns `201`, `workflowState: "submitted"`, and reviewable segments before extraction/review. |
| 2 | Structured review edits preserve extracted vs corrected payloads, and only approved segments promote into canonical repositories with provenance. | ✓ VERIFIED | `tests/storage/ingestion-session-repository.test.ts` proves corrected payload persistence and boundary edits, and `tests/services/ingestion-review-workflow.test.ts` proves normalized payload recomputation plus approval-gated canonical/provenance promotion. |
| 3 | Consistency checks stay explicit and do not run automatically during submit, extract, patch, or approve. | ✓ VERIFIED | `tests/api/check-controls-api.test.ts` proves pre-approval check returns `409`, approval itself leaves verdict runs at zero, and only explicit `POST /api/ingestion/submissions/:sessionId/check` transitions the session to `checked` with a `runId`. |
| 4 | Phase 05 completion evidence is present across UAT, security, and validation gates. | ✓ VERIFIED | `05-UAT.md` records 5/5 pass, `05-SECURITY.md` is `status: verified` with `threats_open: 0`, and `05-VALIDATION.md` is `status: verified`, `nyquist_compliant: true`. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/api/app.ts` | Fastify composition for submit/extract/review/read/check routes | ✓ EXISTS + SUBSTANTIVE | Registers the ingestion route set behind a single API builder. |
| `src/api/routes/ingestion-submit.ts` | Submit endpoint | ✓ EXISTS + SUBSTANTIVE | Calls `submitIngestionSession` and returns a persisted snapshot with `201`. |
| `src/api/routes/ingestion-extract.ts` | Extract endpoint | ✓ EXISTS + SUBSTANTIVE | Calls `extractIngestionSession` and returns review-state snapshots. |
| `src/api/routes/ingestion-review.ts` | Structured patch and approval endpoints | ✓ EXISTS + SUBSTANTIVE | Calls `applyReviewPatch` and `approveReviewedSegment` with 404/409 handling. |
| `src/api/routes/ingestion-read.ts` | Snapshot read endpoint | ✓ EXISTS + SUBSTANTIVE | Returns the persisted ingestion snapshot without hidden side effects. |
| `src/api/routes/ingestion-check.ts` | Manual check endpoint | ✓ EXISTS + SUBSTANTIVE | Calls `executeIngestionCheck` and surfaces explicit check-only results. |
| `src/services/ingestion-session.ts` | Submission, segmentation, extraction orchestration | ✓ EXISTS + SUBSTANTIVE | Handles chunk/full-draft segmentation, advisory extraction, and `review_needed` routing. |
| `src/services/ingestion-review.ts` | Structured review patching and approval promotion | ✓ EXISTS + SUBSTANTIVE | Separates review patching from approval-time canonical promotion. |
| `src/services/ingestion-check.ts` | Explicit manual verdict execution | ✓ EXISTS + SUBSTANTIVE | Enforces `approved` prerequisite before `executeVerdictRun`. |
| `src/storage/repositories/ingestion-session-repository.ts` | Durable review-session persistence | ✓ EXISTS + SUBSTANTIVE | Stores extracted/corrected/normalized payloads, spans, and workflow-state recomputation. |
| `tests/services/natural-language-extraction.test.ts` | Natural-language segmentation/extraction proof | ✓ EXISTS + SUBSTANTIVE | Covers reviewable segmentation and low-confidence routing. |
| `tests/storage/ingestion-session-repository.test.ts` | Durable review-session persistence proof | ✓ EXISTS + SUBSTANTIVE | Covers corrected payload persistence, span preservation, and partial approval state. |
| `tests/services/ingestion-review-workflow.test.ts` | Canonical promotion and provenance proof | ✓ EXISTS + SUBSTANTIVE | Covers normalized corrections and approval-gated promotion. |
| `tests/api/ingestion-review-api.test.ts` | API workflow proof | ✓ EXISTS + SUBSTANTIVE | Covers submit, extract, patch, approve, and read workflow states. |
| `tests/api/check-controls-api.test.ts` | Manual-check control proof | ✓ EXISTS + SUBSTANTIVE | Covers 409-before-approval and explicit check transitions. |

**Artifacts:** 15/15 verified

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/api/app.ts` | ingestion route modules | route registration | ✓ WIRED | `buildStoryGraphApi` registers submit, extract, read, review, and check routes in one Fastify app. |
| `src/api/routes/ingestion-submit.ts` | `src/services/ingestion-session.ts` | `submitIngestionSession` | ✓ WIRED | Submit requests validate through Zod and delegate directly to submission orchestration. |
| `src/api/routes/ingestion-extract.ts` | `src/services/ingestion-session.ts` | `extractIngestionSession` | ✓ WIRED | Extraction stays advisory and returns persisted workflow-state snapshots. |
| `src/api/routes/ingestion-review.ts` | `src/services/ingestion-review.ts` | `applyReviewPatch` / `approveReviewedSegment` | ✓ WIRED | Review APIs expose structured patch and approval gates with conflict handling. |
| `src/services/ingestion-review.ts` | `src/storage/repositories/ingestion-session-repository.ts` | corrected-vs-normalized payload persistence | ✓ WIRED | Repository tests prove extracted, corrected, and normalized payloads remain distinct and durable. |
| `src/services/ingestion-review.ts` | canonical repositories + provenance | approval-time promotion | ✓ WIRED | Workflow tests prove only approved segments write canonical graph/provenance records. |
| `src/api/routes/ingestion-check.ts` | `src/services/ingestion-check.ts` | explicit `POST /check` | ✓ WIRED | Manual check route delegates to explicit check orchestration with 409 conflict handling. |
| `src/services/ingestion-check.ts` | `src/services/verdict-runner.ts` | `executeVerdictRun` with `triggerKind: "manual"` | ✓ WIRED | Check-control tests prove verdict runs occur only after the explicit check call. |

**Wiring:** 8/8 connections verified

## Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| FLOW-01: user submits natural-language synopsis or scene text and receives a normalized structured interpretation for review | ✓ SATISFIED | - |
| FLOW-03: user runs consistency checks on demand instead of realtime forced verdicting | ✓ SATISFIED | - |

**Coverage:** 2/2 requirements satisfied

## Anti-Patterns Found

None.

## Human Verification Required

None — submit/review/approve/check behavior is covered by automated storage, service, API, UAT, security, and validation evidence.

## Gaps Summary

**No gaps found.** Phase goal achieved. Ready to proceed.

## Verification Metadata

**Verification approach:** Goal-backward from Phase 5 roadmap goal and the planned submit/review/approve/check workflow  
**Must-haves source:** `05-01-PLAN.md`, `05-02-PLAN.md`, Phase 5 roadmap goal, and completed phase-gate artifacts  
**Automated checks:** natural-language extraction, repository persistence, workflow, and API/manual-check suites reviewed and passing  
**Human checks required:** 0  
**Total verification time:** documentation backfill phase

---
*Verified: 2026-04-09T19:01:04Z*
*Verifier: Codex*
