---
phase: 08-interactive-inspection-surface
review: 08-REVIEW.md
status: resolved
resolved_findings: [WR-01]
created: 2026-04-10
---

# Phase 8 Review Fix

## Resolved

- WR-01: `buildRunInspectionPayload` now uses stored soft-prior `rerankedRepairs` as the display source when advisory data is available, falling back to base `repairCandidates` only when reranked repairs are absent.
- Added a regression test with two repairs attached to the same finding where the advisory order reverses the base repair order.

## Verification

- `npm run test -- tests/services/inspection-payload.test.ts` - PASS, 5 tests.
- `npm run typecheck && npm run test -- tests/services/inspection-payload.test.ts tests/ui/inspection-shell.test.ts && npm run build:ui && npm run test:browser` - PASS, 7 focused Vitest tests plus 1 Chromium browser test.
