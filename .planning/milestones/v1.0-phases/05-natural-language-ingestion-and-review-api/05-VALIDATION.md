---
phase: 05
slug: natural-language-ingestion-and-review-api
status: verified
nyquist_compliant: true
wave_0_complete: true
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
| **Estimated runtime** | ~2 seconds |

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
| 05-01-01 | 01 | 1 | FLOW-01 | T-05-01, T-05-02 | Natural-language submissions segment into reviewable units, normalize into structured candidates, preserve source spans/confidence, and route ambiguous output to `review_needed` instead of canonical writes | integration | `npx vitest run tests/services/natural-language-extraction.test.ts tests/api/ingestion-review-api.test.ts` | ✅ `tests/services/natural-language-extraction.test.ts`, `tests/api/ingestion-review-api.test.ts` | ✅ green |
| 05-02-01 | 02 | 2 | FLOW-01, FLOW-03 | T-05-03, T-05-04, T-05-05 | Structured review patches preserve original-vs-corrected values, segment approval gates canonical promotion, and `check` runs only on explicit request | integration | `npx vitest run tests/storage/ingestion-session-repository.test.ts tests/services/ingestion-review-workflow.test.ts tests/api/check-controls-api.test.ts` | ✅ `tests/storage/ingestion-session-repository.test.ts`, `tests/services/ingestion-review-workflow.test.ts`, `tests/api/check-controls-api.test.ts` | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing Vitest infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors covered by Phase 05 requirements have automated verification.

## Validation Audit 2026-04-10

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 45s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** verified 2026-04-10
