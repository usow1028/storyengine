---
status: complete
phase: 04-corpus-priors-and-soft-pattern-layer
source:
  - 04-01-SUMMARY.md
  - 04-02-SUMMARY.md
started: 2026-04-09T13:03:59Z
updated: 2026-04-09T16:03:50Z
---

## Current Test

[testing complete]

## Tests

### 1. Prior Build Smoke Test
expected: Run the concrete fish-compatible shell block from Current Test. It should finish without watch mode and write `baseline.prior.json` plus at least one `genre-<key>.prior.json`.
result: pass

### 2. Corpus Normalization Regression
expected: `npx vitest run tests/corpus/corpus-normalization.test.ts` passes and confirms curated corpus rows normalize into canonical event/state/world-rule exception structures.
result: pass

### 3. Prior Snapshot Export Regression
expected: `npx vitest run tests/corpus/prior-build.test.ts` passes and confirms separate baseline and genre snapshots, preserved snapshot IDs, and recorded `sampleCount`.
result: pass

### 4. Soft Drift Scoring Regression
expected: `npx vitest run tests/engine/soft-prior-scoring.test.ts` passes and confirms drift type scores remain decomposed, a dominant prior layer is recorded, and sparse layers weaken through dynamic thresholds.
result: pass

### 5. Repair Plausibility Regression
expected: `npx vitest run tests/engine/repair-plausibility.test.ts` passes and confirms repair candidates rerank by plausibility while hard verdict kinds stay unchanged.
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[]
