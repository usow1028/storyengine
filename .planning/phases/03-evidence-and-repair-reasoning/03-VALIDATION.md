---
phase: 03
slug: evidence-and-repair-reasoning
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-04-09
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/engine/evidence-traces.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~2 seconds |

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
| 03-01-01 | 01 | 1 | VERD-02 | T-03-01, T-03-02 | Evidence snapshots preserve exact event/state/rule provenance and deterministic explanation inputs | integration | `npx vitest run tests/engine/evidence-traces.test.ts tests/storage/persistence.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | REPR-01, REPR-02 | T-03-03, T-03-04 | Repair candidates stay reason-scoped, locally grounded, ranked separately from validity, and provenance-preserving | integration | `npx vitest run tests/engine/repair-generator.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 3 | VERD-03 | T-03-05, T-03-06 | Every evaluation execution becomes its own verdict run and diffs against the immediately previous run using stable finding IDs | integration | `npx vitest run tests/engine/verdict-runner.test.ts tests/engine/verdict-diff.test.ts tests/storage/persistence.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors should have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
