---
phase: 04
slug: corpus-priors-and-soft-pattern-layer
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-09
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/corpus/corpus-normalization.test.ts` |
| **Full suite command** | `npm run test:priors` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task-specific command from the table below
- **After every plan wave:** Run `npm run test:priors`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | DATA-02 | T-04-01, T-04-02 | Corpus works normalize into canonical event/state/world-rule records and build versioned baseline/genre prior snapshots for offline export | integration | `npx vitest run tests/corpus/corpus-normalization.test.ts tests/corpus/prior-build.test.ts` | ✅ `tests/corpus/corpus-normalization.test.ts`, `tests/corpus/prior-build.test.ts` | ✅ green |
| 04-02-01 | 02 | 2 | SOFT-01, DATA-02 | T-04-03, T-04-04 | Soft priors produce drift-type scores, dominant-layer evidence, dynamic thresholds, and repair plausibility changes without altering hard verdict kinds | integration | `npx vitest run tests/engine/soft-prior-scoring.test.ts tests/engine/repair-plausibility.test.ts` | ✅ `tests/engine/soft-prior-scoring.test.ts`, `tests/engine/repair-plausibility.test.ts` | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing Vitest infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

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
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** verified 2026-04-10
