---
phase: 10
slug: incremental-extraction-and-review-resilience
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm exec -- vitest run tests/storage/ingestion-session-repository.test.ts tests/services/incremental-extraction-workflow.test.ts tests/api/ingestion-review-api.test.ts tests/api/check-controls-api.test.ts --bail=1` |
| **Full suite command** | `npm run typecheck && npm run test:ingestion` |
| **Estimated runtime** | ~20-40 seconds locally |

---

## Sampling Rate

- **After every task commit:** Run `npm run typecheck` plus the touched targeted Vitest file.
- **After every plan wave:** Run `npm run test:ingestion`.
- **Before `/gsd-verify-work`:** Run `npm run typecheck && npm run test:ingestion`; always include `tests/api/check-controls-api.test.ts` in targeted runs when `/check` semantics are touched.
- **Max feedback latency:** 40 seconds for targeted checks where practical.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | DRAFT-01, DRAFT-04, OPER-01 | T-10-01 / T-10-02 | Selected extraction touches only targeted segments and persists failure or stale status without deleting prior attempt lineage. | service | `npm exec -- vitest run tests/services/incremental-extraction-workflow.test.ts --bail=1` | no - Wave 0 creates | pending |
| 10-01-02 | 01 | 1 | DRAFT-04, OPER-01 | T-10-02 / T-10-03 | Repository snapshot and aggregate state preserve attempt counts, failure summaries, stale markers, and honest partial status. | storage | `npm exec -- vitest run tests/storage/ingestion-session-repository.test.ts --bail=1` | yes | pending |
| 10-01-03 | 01 | 1 | DRAFT-04, REVIEW-02 | T-10-03 / T-10-04 | API extract and read contracts serialize additive retry metadata and selected target behavior without breaking existing fields. | API | `npm exec -- vitest run tests/api/ingestion-review-api.test.ts --bail=1` | yes | pending |
| 10-02-01 | 02 | 2 | REVIEW-01, REVIEW-02 | T-10-01 / T-10-04 | Material edits or retries demote approved segments safely, while unchanged reapproval is idempotent and provenance-backed. | service | `npm exec -- vitest run tests/services/ingestion-review-workflow.test.ts --bail=1` | yes | pending |
| 10-02-02 | 02 | 2 | REVIEW-01, OPER-01 | T-10-01 / T-10-05 | Full-session `/check` remains blocked unless every required segment is approved, even after partial approval and retry flows. | API | `npm exec -- vitest run tests/api/check-controls-api.test.ts --bail=1` | yes | pending |
| 10-03-01 | 03 | 3 | DRAFT-04, REVIEW-01, REVIEW-02, OPER-01 | T-10-01 / T-10-02 / T-10-05 | Multi-segment lifecycle proves selected extract, failure mix, approval reset, reapproval, and check blocking through the public workflow. | service + API | `npm exec -- vitest run tests/services/incremental-extraction-workflow.test.ts tests/api/ingestion-review-api.test.ts tests/api/check-controls-api.test.ts --bail=1` | partial - Wave 0 extends | pending |

*Status: pending until execution creates or extends the listed tests.*

---

## Wave 0 Requirements

- [ ] `tests/services/incremental-extraction-workflow.test.ts` — create lifecycle coverage for selected extract, mixed success/failure, stale demotion, and explicit approval reset semantics.
- [ ] `tests/storage/ingestion-session-repository.test.ts` — extend with attempt ledger persistence, additive retry summary fields, and aggregate session-state recomputation.
- [ ] `tests/api/ingestion-review-api.test.ts` — extend with `segmentId[]` extract requests, retry metadata serialization, and untouched approved segment preservation.
- [ ] `tests/api/check-controls-api.test.ts` — extend with partial approval plus retry flows that must still block unsafe full-session `/check`.
- [ ] `tests/services/ingestion-review-workflow.test.ts` — extend with unchanged approved reapproval no-op, changed approved segment demotion, and provenance stability assertions.

---

## Manual-Only Verifications

All planned Phase 10 behaviors have automated verification paths. No manual-only checks are required unless execution introduces an external dependency or CLI flow not covered by Vitest.

---

## Threat References

| Threat | Risk | Required Mitigation |
|--------|------|---------------------|
| T-10-01 | Approved segment is retried or patched without explicit approval reset | Require explicit reset semantics, clear approval in the same transaction, and force reapproval before the segment contributes to a fully approved session |
| T-10-02 | Retry lineage is lost because current candidates are overwritten | Add append-only attempt history separate from the current snapshot representation |
| T-10-03 | Mixed outcomes are hidden behind overly optimistic session state | Persist explicit per-segment attempt and stale metadata and recompute honest aggregate state |
| T-10-04 | Retry APIs accept invalid or cross-session segment targets | Keep structural validation in Zod and perform ownership, existence, and conflict checks in service-layer logic |
| T-10-05 | Partial approval is mistaken for safe full-session check eligibility | Preserve the current full-session approval gate until Phase 11 introduces explicit approved-scope checks |

---

## Validation Sign-Off

- [ ] All tasks have automated verification or Wave 0 dependencies.
- [ ] Sampling continuity: no 3 consecutive tasks without automated verification.
- [ ] Wave 0 covers all missing references.
- [ ] No watch-mode flags.
- [ ] Feedback latency < 40 seconds for targeted checks.
- [ ] `nyquist_compliant: true` set in frontmatter after Phase 10 validation passes.

**Approval:** pending
