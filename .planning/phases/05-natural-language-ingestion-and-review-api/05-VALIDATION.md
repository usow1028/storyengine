---
phase: 05
slug: natural-language-ingestion-and-review-api
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/services/natural-language-extraction.test.ts` |
| **Full suite command** | `npm run test:ingestion` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task-specific command from the table below
- **After every plan wave:** Run `npm run test:ingestion`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | FLOW-01 | T-05-01, T-05-02 | Natural-language submissions segment into reviewable units, normalize into structured candidates, preserve source spans/confidence, and route ambiguous output to `review_needed` instead of canonical writes | integration | `npx vitest run tests/services/natural-language-extraction.test.ts tests/api/ingestion-review-api.test.ts` | ❌ W0 `tests/services/natural-language-extraction.test.ts`, `tests/api/ingestion-review-api.test.ts` | ⬜ pending |
| 05-02-01 | 02 | 2 | FLOW-01, FLOW-03 | T-05-03, T-05-04 | Structured review patches preserve original-vs-corrected values, segment approval gates canonical promotion, and `check` runs only on explicit request | integration | `npx vitest run tests/storage/ingestion-session-repository.test.ts tests/services/ingestion-review-workflow.test.ts tests/api/check-controls-api.test.ts` | ❌ W0 `tests/storage/ingestion-session-repository.test.ts`, `tests/services/ingestion-review-workflow.test.ts`, `tests/api/check-controls-api.test.ts` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/services/natural-language-extraction.test.ts` — service-level coverage for chunk/full-draft extraction, segmentation, and `review_needed`
- [ ] `tests/storage/ingestion-session-repository.test.ts` — persistence coverage for session state, provenance, and correction audit trails
- [ ] `tests/services/ingestion-review-workflow.test.ts` — approval and canonical-promotion workflow coverage
- [ ] `tests/api/ingestion-review-api.test.ts` — HTTP surface coverage for submit/extract/review routes
- [ ] `tests/api/check-controls-api.test.ts` — HTTP surface coverage for explicit `check` behavior
- [ ] `package.json` — add `test:ingestion` without watch mode

---

## Manual-Only Verifications

All targeted Phase 5 behaviors should have automated verification. Manual verification should be reserved only for provider-specific extraction quality checks that cannot be stabilized in deterministic fixtures.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
