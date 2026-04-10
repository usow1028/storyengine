---
phase: 07
slug: soft-prior-runtime-integration
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-10
---

# Phase 07 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/services/soft-prior-runtime.test.ts tests/engine/verdict-runner.test.ts tests/services/ingestion-check-soft-prior.test.ts tests/api/check-controls-api.test.ts` |
| **Full suite command** | `npm run typecheck && npm run test:priors && npm run test:ingestion` |
| **Estimated runtime** | <45 seconds for focused task commands; full phase gate varies |

---

## Sampling Rate

- **After every task commit:** Run the task's `<automated>` command; when multiple Phase 7 surfaces may be affected, run `npx vitest run tests/services/soft-prior-runtime.test.ts tests/engine/verdict-runner.test.ts tests/services/ingestion-check-soft-prior.test.ts tests/api/check-controls-api.test.ts`
- **After every plan wave:** Run `npm run typecheck && npm run test:priors && npm run test:ingestion`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | SOFT-01 | T-07-01 / T-07-02 / T-07-03 / T-07-05 | Runtime wrapper builds corpus-compatible transition tokens, wraps disabled/missing/invalid/insufficient prior states, and prevents raw prior artifact leakage. | service/unit | `npx vitest run tests/services/soft-prior-runtime.test.ts tests/engine/verdict-runner.test.ts` | created by task | pending |
| 07-01-02 | 01 | 1 | SOFT-01 | T-07-04 | `executeVerdictRun` computes advisory soft-prior output only after hard verdict persistence and proves hard verdict/run invariance. | service/unit | `npx vitest run tests/engine/verdict-runner.test.ts` | exists; extend | pending |
| 07-02-01 | 02 | 2 | SOFT-01 | T-07-06 / T-07-07 / T-07-08 / T-07-10 | Manual check service and API schemas expose a separate `softPrior` block while keeping snapshot config server-side only. | API/schema | `npx vitest run tests/api/check-controls-api.test.ts` | exists; extend | pending |
| 07-02-02 | 02 | 2 | SOFT-01 | T-07-09 | Disabled and missing snapshot cases still complete hard ingestion checks, persist a run, and update `lastVerdictRunId`. | service/integration | `npx vitest run tests/services/ingestion-check-soft-prior.test.ts tests/api/check-controls-api.test.ts` | created by task | pending |
| 07-03-01 | 03 | 3 | SOFT-01 | T-07-11 / T-07-14 | Soft-prior ingestion fixtures compile, are imported by the API test suite, and assert event payloads that exercise both hard-check and prior-token paths. | API fixture/unit | `npx vitest run tests/api/check-controls-api.test.ts -t "builds soft-prior ingestion candidates"` | created by task | pending |
| 07-03-02 | 03 | 3 | SOFT-01 | T-07-12 / T-07-13 / T-07-15 | Full submit/extract/review/approve/check E2E returns available advisory output and compares enabled vs disabled persisted hard verdict data. | API E2E | `npm run typecheck && npm run test:priors && npm run test:ingestion` | exists; extend | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Coverage Resolution

- [x] `tests/services/soft-prior-runtime.test.ts` coverage is assigned to Task `07-01-01` before runtime wrapper completion.
- [x] `tests/engine/verdict-runner.test.ts` hard-verdict invariance coverage is assigned to Tasks `07-01-01` and `07-01-02`.
- [x] `tests/services/ingestion-check-soft-prior.test.ts` missing/disabled snapshot propagation coverage is assigned to Task `07-02-02`.
- [x] `tests/api/check-controls-api.test.ts` schema preservation, fixture import/assertion, available advisory E2E, and hard-verdict invariance coverage is assigned to Tasks `07-02-01`, `07-03-01`, and `07-03-02`.
- [x] No separate pre-implementation Wave 0 task remains necessary because every previously missing validation item is mapped to one of the six executable plan tasks with an automated verify command.

---

## Manual-Only Verifications

All Phase 07 behaviors have automated verification. Manual review is only needed if the planner intentionally defers soft-prior persistence or richer per-transition browsing to a later phase.

---

## Validation Sign-Off

- [x] All six planned tasks have `<automated>` verify commands.
- [x] Sampling continuity: every task has automated feedback.
- [x] Wave 0 coverage resolution maps all previously missing references to planned tasks.
- [x] No watch-mode flags.
- [x] Feedback latency target remains < 45s for focused task commands; full phase gate runs before `/gsd-verify-work`.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** planning artifact approved for checker re-run
