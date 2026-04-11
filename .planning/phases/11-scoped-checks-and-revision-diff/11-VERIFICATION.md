---
phase: 11-scoped-checks-and-revision-diff
verified: 2026-04-11T07:56:00Z
status: passed
score: 4/4 must-haves verified
gaps_found: 0
human_verification: 0
---

# Phase 11: Scoped Checks and Revision Diff Verification Report

**Phase Goal:** Run deterministic checks over explicit approved draft scope and compare consistency changes across revisions or runs  
**Verified:** 2026-04-11T07:56:00Z  
**Status:** passed  
**Re-verify needed:** No

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Check requests validate that the selected scope is persisted, approved, current, and resolvable to canonical story data. | ✓ VERIFIED | `src/services/ingestion-check.ts` resolves only persisted `scopeId` values from `snapshot.checkScopes`, maps scope kinds back to ordered segment membership, and throws `IngestionConflictError` when any in-scope segment is unresolved. `src/api/routes/ingestion-check.ts` exposes the same behavior on `POST /check`, while `tests/services/scoped-ingestion-check.test.ts` and `tests/api/check-controls-api.test.ts` prove approved-scope success plus stale/unapproved `409` failures. |
| 2 | Verdict runs persist scope metadata additively without changing deterministic hard-verdict classification. | ✓ VERIFIED | `src/domain/verdicts.ts` defines `VerdictRunScopeSchema`, `src/storage/migrations/0007_scoped_verdict_runs.sql` adds nullable scope columns plus an index, and `src/storage/repositories/verdict-run-repository.ts` round-trips `scopeId`, `scopeKind`, `comparisonScopeKey`, and `scope_payload`. `src/services/verdict-runner.ts` still evaluates the full revision graph deterministically, then retains only scope-anchored verdicts for scoped persistence. |
| 3 | Revision or run diffs classify added, resolved, persisted, and changed findings with scope labels. | ✓ VERIFIED | `src/services/verdict-diff.ts` resolves base runs in strict order (`baseRunId` → `baseRevisionId` → `previousRunId`), rejects incompatible `comparisonScopeKey` mismatches, and emits `findingChanges` with `changeKind`, `scopeId`, and `comparisonScopeKey`. `src/services/inspection-payload.ts` and `src/domain/inspection.ts` serialize those diff items through the inspection response, and `tests/engine/verdict-diff.test.ts`, `tests/services/inspection-payload.test.ts`, and `tests/api/inspection-api.test.ts` prove the labeled diff behavior. |
| 4 | Soft-prior advisories remain separate from hard verdict truth in scoped checks and inspection output. | ✓ VERIFIED | `src/services/verdict-runner.ts` derives hard verdicts before soft-prior evaluation, `src/services/ingestion-check.ts` returns advisory data separately from hard verdict run metadata, and `src/services/inspection-payload.ts` keeps `advisory` outside `deterministicVerdict` and `findingChanges`. `tests/api/check-controls-api.test.ts` and `tests/api/inspection-api.test.ts` assert that advisory internals do not leak into deterministic verdict fields. |

**Score:** 4/4 truths verified

## Required Artifacts

| Artifact | Expected Role | Status | Details |
|----------|---------------|--------|---------|
| `src/services/ingestion-check.ts` | Scoped manual check orchestration and fail-closed approval guard | ✓ EXISTS + SUBSTANTIVE | Resolves persisted scopes, validates approved/current segment state, and returns scope-aware run identifiers. |
| `src/services/verdict-runner.ts` | Deterministic verdict execution with optional scoped retention | ✓ EXISTS + SUBSTANTIVE | Preserves full-graph evaluation while limiting persisted verdicts to scope-anchored events. |
| `src/storage/repositories/verdict-run-repository.ts` | Scope-aware verdict run persistence and comparable-run lookup | ✓ EXISTS + SUBSTANTIVE | Stores scope metadata additively and resolves latest comparable runs by `comparison_scope_key`. |
| `src/services/verdict-diff.ts` | Deterministic diff selection and finding-level change classification | ✓ EXISTS + SUBSTANTIVE | Supports explicit base selectors and emits labeled `findingChanges`. |
| `src/services/inspection-payload.ts` | Inspection payload serialization for explicit diff selectors | ✓ EXISTS + SUBSTANTIVE | Threads explicit selectors into diff generation and normalizes rich diff payloads additively. |
| `src/api/routes/ingestion-check.ts` | Public scoped `/check` surface | ✓ EXISTS + SUBSTANTIVE | Parses optional `scopeId`, forwards it to the service, and preserves stable `409` conflicts. |
| `src/api/routes/inspection.ts` | Public inspection diff selector surface | ✓ EXISTS + SUBSTANTIVE | Accepts `baseRunId` or `baseRevisionId`, rejects invalid combinations, and maps missing/incompatible comparisons to stable JSON. |
| `src/api/schemas.ts` | Additive scoped-check and inspection selector/request-response contracts | ✓ EXISTS + SUBSTANTIVE | Exposes `CheckIngestionRequestSchema`, scoped response fields, and `InspectionRunQuerySchema`. |
| `tests/services/scoped-ingestion-check.test.ts` | Service proof for persisted scope resolution and fail-closed semantics | ✓ EXISTS + SUBSTANTIVE | Covers approved/current gating, persisted scope lookup, and scope-aware run metadata. |
| `tests/engine/verdict-diff.test.ts` | Engine proof for explicit diff selectors and incompatible scope rejection | ✓ EXISTS + SUBSTANTIVE | Covers base selector precedence, same-scope revision lookup, and mismatch failures. |
| `tests/services/inspection-payload.test.ts` | Service proof for lean finding-level diff serialization | ✓ EXISTS + SUBSTANTIVE | Verifies `findingChanges`, scope labels, and advisory separation. |
| `tests/api/check-controls-api.test.ts` | Public scoped-check API proof | ✓ EXISTS + SUBSTANTIVE | Verifies scoped success, stale-scope `409`, and preserved full-session blocking when `scopeId` is absent. |
| `tests/api/inspection-api.test.ts` | Public explicit inspection selector proof | ✓ EXISTS + SUBSTANTIVE | Verifies scope-labeled `findingChanges` and stable `409` behavior for incompatible revisions. |

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/services/ingestion-check.ts` | `src/storage/repositories/verdict-run-repository.ts` | Scoped checks persist deterministic comparison identity for later diff selection | ✓ WIRED | `gsd-tools verify key-links` for `11-01-PLAN.md` verified 3/3 links. |
| `src/services/verdict-runner.ts` | `src/services/inspection-payload.ts` | Scoped runs still emit inspection snapshots and advisory data from the same deterministic execution path | ✓ WIRED | Phase 11 tests and run inspection serialization passed end to end. |
| `src/services/verdict-diff.ts` | `src/storage/repositories/verdict-run-repository.ts` | Explicit base revision lookup resolves only same-scope comparable runs | ✓ WIRED | `gsd-tools verify key-links` for `11-02-PLAN.md` verified 3/3 links. |
| `src/services/inspection-payload.ts` | `src/domain/inspection.ts` | Finding-level diff labels are serialized through stable public DTOs | ✓ WIRED | Inspection payload tests and API tests passed with `findingChanges`. |
| `src/api/routes/ingestion-check.ts` | `src/services/ingestion-check.ts` | Route passes optional `scopeId` through the existing `/check` surface | ✓ WIRED | `gsd-tools verify key-links` for `11-03-PLAN.md` verified the pattern. |
| `src/api/routes/inspection.ts` | `src/services/inspection-payload.ts` | Inspection API forwards explicit base selectors into the diff payload builder | ✓ WIRED | `gsd-tools verify key-links` for `11-03-PLAN.md` verified the pattern. |
| `tests/api/inspection-api.test.ts` | `src/api/routes/inspection.ts` | API regressions prove explicit comparison selectors and scope-labeled `findingChanges` | ✓ WIRED | `gsd-tools verify key-links` for `11-03-PLAN.md` verified the pattern. |

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| DRAFT-02 | ✓ SATISFIED | Verdict runs now persist deterministic `comparisonScopeKey`, and inspection APIs can compare runs by explicit `baseRunId` or `baseRevisionId` without heuristic fallback. |
| CHECK-01 | ✓ SATISFIED | `POST /check` accepts optional `scopeId` and succeeds only when the selected scope's segments are approved and current; otherwise it fails closed with `409`. |
| DIFF-01 | ✓ SATISFIED | Diff output classifies added, resolved, persisted, and changed findings with scope labels through `findingChanges`, `currentScopeId`, and `baseScopeId`. |
| TRACE-01 | ✓ SATISFIED | Every diff item and scoped run response preserves canonical finding ids, checker/reason codes, rule ids, provenance ids, and scope identifiers. |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase 11 key links, Plan 01 | `node .codex/get-shit-done/bin/gsd-tools.cjs verify key-links .planning/phases/11-scoped-checks-and-revision-diff/11-01-PLAN.md` | 3/3 links verified | PASS |
| Phase 11 key links, Plan 02 | `node .codex/get-shit-done/bin/gsd-tools.cjs verify key-links .planning/phases/11-scoped-checks-and-revision-diff/11-02-PLAN.md` | 3/3 links verified | PASS |
| Phase 11 key links, Plan 03 | `node .codex/get-shit-done/bin/gsd-tools.cjs verify key-links .planning/phases/11-scoped-checks-and-revision-diff/11-03-PLAN.md` | 3/3 links verified | PASS |
| TypeScript contract compile | `npm run typecheck` | `tsc --noEmit` exited 0 | PASS |
| Reasoning gate | `npm run test:reasoning` | 4 files passed, 18 tests passed | PASS |
| Ingestion gate | `npm run test:ingestion` | 6 files passed, 37 tests passed | PASS |
| Inspection payload/API gate | `npm exec -- vitest run tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts --bail=1` | 2 files passed, 11 tests passed | PASS |

## Anti-Patterns Found

None. Phase 11 keeps scoped execution fail-closed, preserves deterministic hard-verdict evaluation, avoids fuzzy cross-scope comparison fallback, and keeps advisory data separate from hard truth.

## Human Verification Required

None. Phase 11 is fully covered by automated service, storage, engine, API, and gate-level verification.

## Gaps Summary

No goal-blocking gaps found. Phase 11 delivers explicit approved-scope checks, deterministic same-scope revision diffs, and traceable finding-level comparison output through the public API.

## Verification Metadata

**Verification approach:** Goal-backward from the Phase 11 roadmap goal and success criteria, cross-checked against `11-01-PLAN.md`, `11-02-PLAN.md`, `11-03-PLAN.md`, all three plan summaries, the clean code review, and the final automated gates.  
**Must-haves source:** Phase 11 roadmap success criteria plus the `must_haves` and `success_criteria` blocks in the three plan files.  
**Automated checks:** `gsd-tools verify key-links` for all three Phase 11 plans, `npm run typecheck`, `npm run test:reasoning`, `npm run test:ingestion`, `npm exec -- vitest run tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts --bail=1`.  
**Human checks required:** 0  
**Total verification time:** phase-close verification pass

---
*Verified: 2026-04-11T07:56:00Z*  
*Verifier: Codex*
