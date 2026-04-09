---
phase: 02
slug: hard-constraint-engine
status: draft
nyquist_compliant: false
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
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task-specific command from the table below
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | RULE-01, RULE-02, RULE-03, RULE-04, VERD-01 | T-02-01, T-02-02 | Checker families emit stable reason-coded findings and preserve skipped-check metadata | unit | `npx vitest run tests/engine/checker-families.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | RULE-01, RULE-02, RULE-03, RULE-04, VERD-01 | T-02-03, T-02-04, T-02-05 | Rule activation, precedence, and representative verdict selection remain deterministic for a revision | integration | `npx vitest run tests/engine/rule-activation.test.ts tests/engine/hard-constraint-engine.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 3 | RULE-01, RULE-02, RULE-03, RULE-04, VERD-01 | T-02-06, T-02-07 | Regression fixtures keep impossible travel, causal gap, and character reversal classifications stable across reruns | integration | `npm run test:engine && npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
