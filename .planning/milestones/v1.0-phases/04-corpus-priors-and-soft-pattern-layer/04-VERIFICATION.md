---
phase: 04-corpus-priors-and-soft-pattern-layer
verified: 2026-04-09T19:01:04Z
status: gaps_found
score: 1/2 must-haves verified
---

# Phase 4: Corpus Priors and Soft Pattern Layer Verification Report

**Phase Goal:** Add pattern-backed soft reasoning without collapsing it into hard law
**Verified:** 2026-04-09T19:01:04Z
**Status:** gaps_found

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | StoryGraph can normalize curated corpus rows into canonical transition observations and export deterministic baseline plus genre prior artifacts offline. | ✓ VERIFIED | `tests/corpus/corpus-normalization.test.ts` proves canonical event/state/world-rule exception normalization, and `tests/corpus/prior-build.test.ts` proves `baseline.prior.json` plus `genre-<key>.prior.json` snapshot exports. |
| 2 | Runtime soft-prior logic remains advisory and separate from hard verdict kinds. | ✓ VERIFIED | `tests/engine/soft-prior-scoring.test.ts` and `tests/engine/repair-plausibility.test.ts` verify drift scoring, layer contribution evidence, and repair reranking while preserving hard verdict kind. |
| 3 | On-demand runtime check flows expose soft-prior output alongside verdict execution. | ✗ FAILED | `src/services/soft-prior-evaluator.ts` exports `evaluateSoftPriors`, but `rg -n "evaluateSoftPriors" src/services/soft-prior-evaluator.ts src/services/verdict-runner.ts src/services/ingestion-check.ts src/api/routes` shows no call site in `src/services/verdict-runner.ts`, `src/services/ingestion-check.ts`, or the API routes. |
| 4 | Phase 04 completion evidence is present across UAT, security, and validation gates. | ✓ VERIFIED | `04-UAT.md` records 5/5 pass, `04-SECURITY.md` is `status: verified` with `threats_open: 0`, and `04-VALIDATION.md` is `status: verified`, `nyquist_compliant: true`. |

**Score:** 3/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/corpus/normalization.ts` | Canonical corpus normalization | ✓ EXISTS + SUBSTANTIVE | Backed by `tests/corpus/corpus-normalization.test.ts` for canonical event/state/world-rule exception shapes. |
| `src/corpus/prior-build.ts` | Offline prior snapshot build/export pipeline | ✓ EXISTS + SUBSTANTIVE | `tests/corpus/prior-build.test.ts` verifies deterministic baseline and genre artifacts. |
| `scripts/build-priors.ts` | Non-watch prior export command | ✓ EXISTS + SUBSTANTIVE | Used by UAT and `build:priors` to emit offline snapshot files. |
| `src/engine/prior-snapshot-loader.ts` | Runtime snapshot loading | ✓ EXISTS + SUBSTANTIVE | Soft-prior engine tests consume immutable prior artifact fixtures through the loader path. |
| `src/engine/soft-prior-scoring.ts` | Layer-aware drift scoring | ✓ EXISTS + SUBSTANTIVE | `tests/engine/soft-prior-scoring.test.ts` verifies dominant layer, thresholds, and drift evidence. |
| `src/engine/repair-plausibility.ts` | Advisory repair reranking | ✓ EXISTS + SUBSTANTIVE | `tests/engine/repair-plausibility.test.ts` verifies advisory reranking without hard-verdict mutation. |
| `src/services/soft-prior-evaluator.ts` | Service orchestration for loading, scoring, and reranking | ✓ EXISTS + SUBSTANTIVE | Exports `evaluateSoftPriors` and preserves incoming `hardVerdictKind`. |
| `src/services/verdict-runner.ts` | Runtime verdict orchestration should surface soft-prior output | ⚠️ EXISTS BUT NOT WIRED | Executes hard verdict runs only; no `evaluateSoftPriors` import or call is present. |
| `src/services/ingestion-check.ts` | Manual check path should expose soft-prior output | ⚠️ EXISTS BUT NOT WIRED | Calls `executeVerdictRun` and returns `runId`/`previousRunId` only, with no soft-prior assessment in the response. |
| `tests/corpus/corpus-normalization.test.ts` | Offline normalization proof | ✓ EXISTS + SUBSTANTIVE | Covers canonical rows and world-rule exception structures. |
| `tests/corpus/prior-build.test.ts` | Offline artifact export proof | ✓ EXISTS + SUBSTANTIVE | Covers baseline/genre snapshot separation and filenames. |
| `tests/engine/soft-prior-scoring.test.ts` | Advisory scoring proof | ✓ EXISTS + SUBSTANTIVE | Covers layer contribution and dynamic threshold behavior. |
| `tests/engine/repair-plausibility.test.ts` | Advisory repair reranking proof | ✓ EXISTS + SUBSTANTIVE | Covers reranking adjustments while preserving hard validity. |

**Artifacts:** 13/13 verified for existence, 2/13 missing required runtime wiring

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/corpus/normalization.ts` | `tests/corpus/corpus-normalization.test.ts` | direct normalization regression inputs | ✓ WIRED | Tests assert canonical event/state/world-rule exception outputs from curated corpus rows. |
| `src/corpus/prior-build.ts` | `scripts/build-priors.ts` | export artifact generation | ✓ WIRED | UAT and `tests/corpus/prior-build.test.ts` rely on the build path to emit deterministic snapshot files. |
| `src/services/soft-prior-evaluator.ts` | `tests/engine/soft-prior-scoring.test.ts` / `tests/engine/repair-plausibility.test.ts` | runtime advisory evaluation helpers | ✓ WIRED | The soft-prior runtime surface is exercised in isolated engine/service tests. |
| `src/services/soft-prior-evaluator.ts` | `src/services/verdict-runner.ts` | verdict execution integration | ✗ NOT WIRED | No `evaluateSoftPriors` call exists in the verdict-runner path. |
| `src/services/verdict-runner.ts` | `src/services/ingestion-check.ts` | explicit manual check | ✓ WIRED | `executeIngestionCheck` delegates to `executeVerdictRun` after approval. |
| `src/services/ingestion-check.ts` | `src/api/routes/ingestion-check.ts` | `POST /api/ingestion/submissions/:sessionId/check` | ✓ WIRED | The API check route returns manual check results, but those results contain no soft-prior assessment. |

**Wiring:** 5/6 connections verified

## Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| DATA-02: system supports offline corpus extraction and analysis to build or revise soft priors | ✓ SATISFIED | - |
| SOFT-01: engine uses corpus-derived narrative patterns as soft priors without promoting them to hard rules | ✗ BLOCKED | `evaluateSoftPriors` is isolated from `src/services/verdict-runner.ts`, `src/services/ingestion-check.ts`, and the check API response, so soft-prior output is not part of the live runtime flow. |

**Coverage:** 1/2 requirements satisfied

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/services/verdict-runner.ts` | - | No `evaluateSoftPriors` import or call in the verdict execution path | 🛑 Blocker | Runtime checks cannot emit soft-drift-informed output, so `SOFT-01` is not satisfied end to end. |
| `src/services/ingestion-check.ts` | - | Manual check response returns only hard verdict run metadata | ⚠️ Warning | Even after approval and explicit check, API consumers cannot inspect soft-prior assessment results. |

**Anti-patterns:** 2 found (1 blocker, 1 warning)

## Human Verification Required

None — the remaining gap is code-path wiring, not a manual-only behavior.

## Gaps Summary

### Critical Gaps (Block Progress)

1. **Soft-prior runtime integration is missing**
   - Missing: A call from live verdict execution into `evaluateSoftPriors`, plus propagation of assessment and repair-plausibility output through the manual check/API path.
   - Impact: Phase 04 proves offline priors and isolated advisory scoring, but does not yet satisfy end-to-end `SOFT-01`.
   - Fix: Wire soft-prior evaluation into verdict execution and expose the advisory result surface in the runtime/API flow during Phase 7.

### Non-Critical Gaps (Can Defer)

None.

## Recommended Fix Plans

### 07-01-PLAN.md: Soft-Prior Runtime Wiring

**Objective:** Integrate soft-prior evaluation into live verdict execution without collapsing hard and soft outputs.

**Tasks:**
1. Add a soft-prior evaluation hook to verdict execution after hard verdict generation.
2. Extend manual check/API response shapes so advisory soft-prior results and repair adjustments are inspectable.
3. Add end-to-end tests that prove submit/review/approve/check can surface soft-drift-informed output.

**Estimated scope:** Medium

## Verification Metadata

**Verification approach:** Goal-backward from Phase 4 roadmap goal and must-have split between offline priors and runtime advisory output  
**Must-haves source:** `04-01-PLAN.md`, `04-02-PLAN.md`, Phase 4 roadmap goal, and the milestone audit blocker for `SOFT-01`  
**Automated checks:** corpus normalization/build suites passed, soft-prior scoring/repair suites passed, runtime `rg` wiring inspection failed for live integration  
**Human checks required:** 0  
**Total verification time:** documentation backfill phase

---
*Verified: 2026-04-09T19:01:04Z*
*Verifier: Codex*
