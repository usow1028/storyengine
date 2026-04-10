---
status: complete
phase: 05-natural-language-ingestion-and-review-api
source:
  - 05-01-SUMMARY.md
  - 05-02-SUMMARY.md
started: 2026-04-09T17:57:06Z
updated: 2026-04-09T18:03:59Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: fresh pg-mem과 새 Fastify app 초기화 직후 첫 submit 요청이 201을 반환하고, 응답 JSON에 `workflowState: "submitted"` 및 세그먼트 1개가 포함된다.
result: pass

### 2. Full-Draft Review Session Regression
expected: `npx vitest run tests/api/ingestion-review-api.test.ts` 가 통과하고, full draft submit/extract 뒤 structured patch와 segment approval이 `needs_review -> partially_approved -> approved` 전이를 유지한다.
result: pass

### 3. Canonical Promotion and Provenance Regression
expected: `npx vitest run tests/services/ingestion-review-workflow.test.ts` 가 통과하고, corrected payload가 normalized payload로 반영되며 승인된 세그먼트만 canonical graph와 provenance 레코드로 승격된다.
result: pass

### 4. Manual Check Control Regression
expected: `npx vitest run tests/api/check-controls-api.test.ts` 가 통과하고, approval 전 `POST /api/ingestion/submissions/:sessionId/check` 는 409를 반환하며 approval 자체는 verdict run을 트리거하지 않고, explicit check 이후에만 `checked` 와 `runId` 가 나온다.
result: pass

### 5. Full Ingestion Regression Sweep
expected: `npm run test:ingestion` 이 통과하고 storage, extraction, review patch, approval, manual check 흐름이 한 번에 green으로 유지된다.
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
