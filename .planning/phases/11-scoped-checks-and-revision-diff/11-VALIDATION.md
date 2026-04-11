---
phase: 11
slug: scoped-checks-and-revision-diff
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm exec -- vitest run tests/services/scoped-ingestion-check.test.ts tests/storage/verdict-run-inspection-snapshot.test.ts tests/engine/verdict-diff.test.ts tests/services/inspection-payload.test.ts tests/api/check-controls-api.test.ts tests/api/inspection-api.test.ts --bail=1` |
| **Full suite command** | `npm run typecheck && npm run test:reasoning && npm run test:ingestion && npm exec -- vitest run tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts --bail=1` |
| **Estimated runtime** | ~25-45 seconds locally |

---

## Sampling Rate

- **After every task commit:** Run `npm run typecheck` plus the touched targeted Vitest file.
- **After every plan wave:** Run the quick command above or the smallest relevant subset that still covers the touched contracts.
- **Before `/gsd-verify-work`:** Run the full suite command.
- **Max feedback latency:** 45 seconds for targeted checks where practical.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | CHECK-01, TRACE-01 | T-11-01 / T-11-02 | Scoped checks resolve only persisted `scopeId` values and reject any scope with unapproved or stale segments. | service | `npm exec -- vitest run tests/services/scoped-ingestion-check.test.ts --bail=1` | no - Wave 0 creates | pending |
| 11-01-02 | 01 | 1 | DRAFT-02, CHECK-01 | T-11-02 / T-11-05 | Verdict runs persist raw scope metadata plus deterministic comparison identity so later revisions can find comparable runs without heuristics. | storage | `npm exec -- vitest run tests/storage/verdict-run-inspection-snapshot.test.ts --bail=1` | yes | pending |
| 11-01-03 | 01 | 1 | CHECK-01, TRACE-01 | T-11-01 / T-11-04 | Scoped execution derives in-scope event membership from approved candidates, retains only scope-anchored verdicts, and preserves hard/soft separation in run results. | service | `npm exec -- vitest run tests/services/scoped-ingestion-check.test.ts tests/services/inspection-payload.test.ts --bail=1` | partial - Wave 0 extends | pending |
| 11-02-01 | 02 | 2 | DRAFT-02, DIFF-01 | T-11-02 / T-11-05 | Diffing supports explicit `baseRunId` and `baseRevisionId` while rejecting incompatible scopes instead of falling back silently. | engine | `npm exec -- vitest run tests/engine/verdict-diff.test.ts --bail=1` | yes | pending |
| 11-02-02 | 02 | 2 | DIFF-01, TRACE-01 | T-11-03 / T-11-04 | Finding-level diff items include scope labels and trace identifiers without embedding full inspection snapshots. | service | `npm exec -- vitest run tests/services/inspection-payload.test.ts --bail=1` | yes | pending |
| 11-03-01 | 03 | 3 | CHECK-01, TRACE-01 | T-11-01 / T-11-04 | `/check` accepts optional `scopeId`, keeps fail-closed approval semantics, and still returns separate soft-prior advisory output. | API | `npm exec -- vitest run tests/api/check-controls-api.test.ts --bail=1` | yes | pending |
| 11-03-02 | 03 | 3 | DRAFT-02, DIFF-01, TRACE-01 | T-11-02 / T-11-03 / T-11-05 | Inspection API exposes explicit base selectors and scope-labeled finding diffs with deterministic trace fields. | API | `npm exec -- vitest run tests/api/inspection-api.test.ts --bail=1` | yes | pending |
| 11-03-03 | 03 | 3 | DRAFT-02, CHECK-01, DIFF-01, TRACE-01 | T-11-01 / T-11-02 / T-11-03 / T-11-04 / T-11-05 | End-to-end phase gate proves scoped checks, explicit diff selection, and traceable diff items together without hard/soft leakage. | service + API | `npm run typecheck && npm run test:reasoning && npm run test:ingestion && npm exec -- vitest run tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts --bail=1` | yes | pending |

*Status: pending until execution creates or extends the listed tests.*

---

## Wave 0 Requirements

- [ ] `tests/services/scoped-ingestion-check.test.ts` — create scoped check service coverage for scope resolution, approved/current gating, and scope-aware run metadata.
- [ ] `tests/storage/verdict-run-inspection-snapshot.test.ts` — extend with `scopeId`, `scopeKind`, `comparisonScopeKey`, and `scopePayload` persistence assertions.
- [ ] `tests/engine/verdict-diff.test.ts` — extend with explicit base selectors, incompatible-scope rejection, and finding-level scope labels.
- [ ] `tests/services/inspection-payload.test.ts` — extend with lean diff-item trace assertions and advisory separation checks.
- [ ] `tests/api/check-controls-api.test.ts` — extend with `scopeId` request behavior and scoped 409 semantics.
- [ ] `tests/api/inspection-api.test.ts` — extend with explicit comparison selectors and scope-labeled diff response assertions.

---

## Manual-Only Verifications

All planned Phase 11 behaviors have automated verification paths. No manual-only checks are required unless execution introduces an external browser/UI flow beyond the current API payload surface.

---

## Threat References

| Threat | Risk | Required Mitigation |
|--------|------|---------------------|
| T-11-01 | Unapproved or stale scope executes a deterministic check | Resolve `scopeId` to concrete segments and require every segment in that scope to be approved and current before execution |
| T-11-02 | Cross-revision diff silently compares incompatible scopes | Persist deterministic comparison identity and reject unmatched explicit base selectors |
| T-11-03 | Diff responses lose traceability or collapse to opaque summaries | Emit finding-level diff items with canonical IDs, scope labels, and trace fields |
| T-11-04 | Diff payload leaks full inspection evidence or advisory internals | Keep diff items lean and preserve separate soft-prior advisory serialization |
| T-11-05 | Base revision selection picks the wrong comparable run | Resolve explicit base revision through current run story plus comparisonScopeKey and fail closed when none exists |

---

## Validation Sign-Off

- [ ] All tasks have automated verification or Wave 0 dependencies.
- [ ] Sampling continuity: no 3 consecutive tasks without automated verification.
- [ ] Wave 0 covers all missing references.
- [ ] No watch-mode flags.
- [ ] Feedback latency < 45 seconds for targeted checks.
- [ ] `nyquist_compliant: true` set in frontmatter after Phase 11 validation passes.

**Approval:** pending
