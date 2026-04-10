---
phase: 07
slug: soft-prior-runtime-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| **Quick run command** | `npx vitest run tests/engine/verdict-runner.test.ts tests/api/check-controls-api.test.ts` |
| **Full suite command** | `npm run typecheck && npm run test:priors && npm run test:ingestion` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/engine/verdict-runner.test.ts tests/api/check-controls-api.test.ts`
- **After every plan wave:** Run `npm run typecheck && npm run test:priors && npm run test:ingestion`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | SOFT-01 | T-07-01 / T-07-02 | Soft-prior advisory execution attaches after hard verdict generation and does not mutate saved hard verdict kinds, finding IDs, evidence snapshots, or run metadata. | service/unit | `npx vitest run tests/engine/verdict-runner.test.ts` | exists; extend | pending |
| 07-01-02 | 01 | 1 | SOFT-01 | T-07-02 / T-07-03 | Missing or disabled prior snapshots return explicit advisory unavailability while hard checks still complete. | service/integration | `npx vitest run tests/services/ingestion-check-soft-prior.test.ts` | W0 missing | pending |
| 07-02-01 | 02 | 1 | SOFT-01 | T-07-01 / T-07-04 | Check API responses expose a separate `softPrior` advisory block without accepting request-supplied snapshot paths or leaking raw prior artifacts. | API/schema | `npx vitest run tests/api/check-controls-api.test.ts` | exists; extend | pending |
| 07-03-01 | 03 | 2 | SOFT-01 | T-07-01 / T-07-02 / T-07-05 | Full submit, extract, review, approve, check flow returns available soft-prior output and proves hard verdict classification remains stable. | API E2E | `npm run typecheck && npm run test:priors && npm run test:ingestion` | partial; extend | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/services/ingestion-check-soft-prior.test.ts` - covers unavailable and missing snapshot propagation for `SOFT-01`.
- [ ] `tests/api/check-controls-api.test.ts` - add a full-flow soft-prior case with approved event candidates, configured fixture priors, `softPrior.status === "available"`, and hard verdict/run invariance assertions.
- [ ] `src/services/soft-prior-runtime.ts` or equivalent helper tests - covers runtime transition construction parity with corpus normalization token shape.
- [ ] `src/api/schemas.ts` - schema coverage must be proven indirectly through API E2E because the route parses responses through `CheckIngestionResponseSchema`.

---

## Manual-Only Verifications

All Phase 07 behaviors have automated verification. Manual review is only needed if the planner intentionally defers soft-prior persistence or richer per-transition browsing to a later phase.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
