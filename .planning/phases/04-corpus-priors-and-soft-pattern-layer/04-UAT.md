---
status: testing
phase: 04-corpus-priors-and-soft-pattern-layer
source:
  - 04-01-SUMMARY.md
  - 04-02-SUMMARY.md
started: 2026-04-09T13:03:59Z
updated: 2026-04-09T13:23:10Z
---

## Current Test

number: 1
name: Prior Build Smoke Test
expected: |
  아래 fish 호환 명령 블록을 그대로 실행했을 때 watch 모드 없이 종료되고,
  출력 디렉터리에 `baseline.prior.json`과 하나 이상의 `genre-<key>.prior.json`이 생성되어야 합니다.

  ```bash
  set -l tmpdir (mktemp -d)
  node --import tsx --input-type=module -e "import { buildCorpusPriorFixtures } from './tests/fixtures/corpus-prior-fixtures.js'; console.log(JSON.stringify(buildCorpusPriorFixtures(), null, 2));" > "$tmpdir/works.json"
  npm run build:priors -- --input "$tmpdir/works.json" --output-dir "$tmpdir/out"
  find "$tmpdir/out" -maxdepth 1 -type f | sort
  ```
awaiting: user response

## Tests

### 1. Prior Build Smoke Test
expected: Run the concrete fish-compatible shell block from Current Test. It should finish without watch mode and write `baseline.prior.json` plus at least one `genre-<key>.prior.json`.
result: [pending]

### 2. Corpus Normalization Regression
expected: `npx vitest run tests/corpus/corpus-normalization.test.ts` passes and confirms curated corpus rows normalize into canonical event/state/world-rule exception structures.
result: [pending]

### 3. Prior Snapshot Export Regression
expected: `npx vitest run tests/corpus/prior-build.test.ts` passes and confirms separate baseline and genre snapshots, preserved snapshot IDs, and recorded `sampleCount`.
result: [pending]

### 4. Soft Drift Scoring Regression
expected: `npx vitest run tests/engine/soft-prior-scoring.test.ts` passes and confirms drift type scores remain decomposed, a dominant prior layer is recorded, and sparse layers weaken through dynamic thresholds.
result: [pending]

### 5. Repair Plausibility Regression
expected: `npx vitest run tests/engine/repair-plausibility.test.ts` passes and confirms repair candidates rerank by plausibility while hard verdict kinds stay unchanged.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps

[]
