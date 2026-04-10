---
phase: 01
slug: canonical-narrative-schema
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-09
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/canonical/schema.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/canonical/schema.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | MODEL-01 | T-01-01, T-01-02 | Canonical entity/type exports, verdict taxonomy, and schema invariants remain stable | unit | `npx vitest run tests/canonical/schema.test.ts` | ✅ | ✅ green |
| 01-02-01 | 02 | 2 | DATA-01 | T-01-03, T-01-04, T-01-05 | Story/rule/provenance persistence works without silent field loss and round-trips revision lineage | integration | `npx vitest run tests/storage/persistence.test.ts` | ✅ | ✅ green |
| 01-03-01 | 03 | 3 | MODEL-02, MODEL-03 | T-01-06, T-01-07 | State before/after event snapshots reconstruct deterministically with provenance retained | integration | `npx vitest run tests/canonical/reconstruction.test.ts` | ✅ | ✅ green |

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
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-09

---

## Validation Audit 2026-04-09

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
