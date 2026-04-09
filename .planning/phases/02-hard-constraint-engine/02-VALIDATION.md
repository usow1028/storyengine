---
phase: 02
slug: hard-constraint-engine
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-09
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/engine/checker-families.test.ts` |
| **Full suite command** | `npm run test:engine` |
| **Estimated runtime** | ~1.5 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task-specific command from the table below
- **After every plan wave:** Run `npm run test:engine`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | RULE-01, RULE-02, RULE-03, RULE-04, VERD-01 | T-02-01, T-02-02 | Checker families emit stable reason-coded findings and preserve skipped-check metadata | unit | `npx vitest run tests/engine/checker-families.test.ts` | ✅ `tests/engine/checker-families.test.ts` | ✅ green |
| 02-02-01 | 02 | 2 | RULE-01, RULE-02, RULE-03, RULE-04, VERD-01 | T-02-03, T-02-04, T-02-05 | Rule activation, precedence, representative verdict selection, and short-circuit behavior remain deterministic for a revision | integration | `npx vitest run tests/engine/rule-activation.test.ts tests/engine/hard-constraint-engine.test.ts` | ✅ `tests/engine/rule-activation.test.ts`, `tests/engine/hard-constraint-engine.test.ts` | ✅ green |
| 02-03-01 | 03 | 3 | RULE-01, RULE-02, RULE-03, RULE-04, VERD-01 | T-02-06, T-02-07 | Regression fixtures keep impossible travel, causal gap, character reversal, threat exception, and override classifications stable across reruns | integration | `npm run test:engine` | ✅ `tests/fixtures/hard-constraint-fixtures.ts`, `tests/engine/regression-physical-temporal.test.ts`, `tests/engine/regression-causality-character.test.ts`, `tests/engine/regression-overrides.test.ts` | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Audit 2026-04-09

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

**Approval:** verified 2026-04-09
