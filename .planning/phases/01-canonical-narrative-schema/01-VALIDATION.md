---
phase: 01
slug: canonical-narrative-schema
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npx vitest run tests/canonical/*.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/canonical/*.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | MODEL-01 | — | Canonical entity/type exports remain stable | unit | `npx vitest run tests/canonical/schema.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | DATA-01 | — | Story/rule/provenance persistence works without silent field loss | integration | `npx vitest run tests/storage/persistence.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 1 | MODEL-02 | — | State before/after event snapshots reconstruct deterministically | integration | `npx vitest run tests/canonical/reconstruction.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — baseline Vitest configuration
- [ ] `tests/canonical/schema.test.ts` — schema invariants for canonical entities, events, and rules
- [ ] `tests/storage/persistence.test.ts` — storage fixture for persistence/provenance round trips
- [ ] `tests/canonical/reconstruction.test.ts` — reconstruction checks for state before/after event boundaries
- [ ] `npm install -D vitest` — if framework not yet installed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Canonical schema naming clarity | MODEL-01 | Naming quality is partially judgment-based | Review exported type names and table names against CONTEXT.md locked decisions |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
