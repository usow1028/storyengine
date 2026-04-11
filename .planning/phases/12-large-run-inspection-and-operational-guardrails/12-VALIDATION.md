---
phase: 12
slug: large-run-inspection-and-operational-guardrails
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-11
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 + Playwright 1.59.1 |
| **Config file** | `vitest.config.ts` and package `test:browser` script |
| **Quick run command** | `npm exec -- vitest run tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts tests/ui/inspection-shell.test.ts --bail=1` |
| **Full suite command** | `npm run typecheck && npm run test:reasoning && npm run test:ingestion && npm exec -- vitest run tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts tests/ui/inspection-shell.test.ts --bail=1 && npm run test:browser -- tests/browser/inspection-surface.spec.ts` |
| **Estimated runtime** | ~35-70 seconds locally |

---

## Sampling Rate

- **After every task commit:** Run `npm run typecheck` plus the touched targeted Vitest file set.
- **After every plan wave:** Run the quick command above and the relevant browser slice when rendering logic changed.
- **Before `/gsd-verify-work`:** Run the full suite command.
- **Max feedback latency:** 70 seconds for targeted UI plus browser checks where practical.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | INSPECT-01, OPER-01, TRACE-01 | T-12-01 / T-12-03 | Inspection payload exposes operational summary, grouping keys, and provenance summaries without leaking raw snapshots. | service + API | `npm exec -- vitest run tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts --bail=1` | yes | complete |
| 12-01-02 | 01 | 1 | DRAFT-03, TRACE-01 | T-12-03 | Domain schemas describe scope summary, section or chapter grouping keys, and source-span summaries additively. | domain + typecheck | `npm run typecheck && npm exec -- vitest run tests/services/inspection-payload.test.ts --bail=1` | yes | complete |
| 12-01-03 | 01 | 1 | OPER-01, REVIEW-02, TRACE-01 | T-12-01 / T-12-03 / T-12-04 | Payload builder resolves segment and provenance context from stored records and returns sanitized warning counts plus source references. | service + API | `npm exec -- vitest run tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts --bail=1 && npm run typecheck` | yes | complete |
| 12-02-01 | 02 | 2 | INSPECT-01, OPER-01 | T-12-01 / T-12-02 | UI regression coverage proves the warning banner, global filter bar, and grouped triage render from the additive payload. | UI + browser | `npm exec -- vitest run tests/ui/inspection-shell.test.ts --bail=1 && npm run test:browser -- tests/browser/inspection-surface.spec.ts` | yes | complete |
| 12-02-02 | 02 | 2 | INSPECT-01 | T-12-02 | Browser filtering remains combinable and preserves fixed verdict-kind order while grouping by section or chapter inside each bucket. | UI | `npm exec -- vitest run tests/ui/inspection-shell.test.ts --bail=1 && npm run typecheck` | yes | complete |
| 12-02-03 | 02 | 2 | DRAFT-03, REVIEW-02, TRACE-01 | T-12-03 | Row-level provenance and detail source spans remain visible before and after selection. | UI + browser | `npm exec -- vitest run tests/ui/inspection-shell.test.ts --bail=1 && npm run test:browser -- tests/browser/inspection-surface.spec.ts` | yes | complete |
| 12-03-01 | 03 | 3 | INSPECT-01, OPER-01, REVIEW-02 | T-12-01 / T-12-02 / T-12-03 | Mixed-state fixtures prove inspectable runs stay honest about unresolved, stale, or failed draft state. | fixtures + API + browser | `npm exec -- vitest run tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts tests/ui/inspection-shell.test.ts --bail=1 && npm run test:browser -- tests/browser/inspection-surface.spec.ts` | yes | complete |
| 12-03-02 | 03 | 3 | INSPECT-01, TRACE-01, OPER-01 | T-12-01 / T-12-02 / T-12-03 / T-12-04 | Milestone gate proves large-run browsing remains deterministic, traceable, and advisory-prior-safe after Phase 12 changes. | full regression | `npm run typecheck && npm run test:reasoning && npm run test:ingestion && npm exec -- vitest run tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts tests/ui/inspection-shell.test.ts --bail=1 && npm run test:browser -- tests/browser/inspection-surface.spec.ts` | yes | complete |

*Status: complete. All planned Phase 12 verification paths were exercised during execution.*

---

## Wave 0 Requirements

- [x] Extend `tests/services/inspection-payload.test.ts` — operational summary, section or chapter grouping keys, and provenance summary assertions.
- [x] Extend `tests/api/inspection-api.test.ts` — additive inspection response contract assertions for warning counts and grouping/filter metadata.
- [x] Extend `tests/ui/inspection-shell.test.ts` — warning banner, global filters, grouped triage, and detail provenance rendering.
- [x] Extend `tests/browser/inspection-surface.spec.ts` — end-to-end grouped browsing and prominent partial-state visibility.

---

## Manual-Only Verifications

All planned Phase 12 behaviors have automated verification paths. No manual-only checks are required unless execution introduces a browser interaction that cannot be stabilized in Playwright.

---

## Threat References

| Threat | Risk | Required Mitigation |
|--------|------|---------------------|
| T-12-01 | Inspection UI hides stale, failed, or unresolved draft state behind a seemingly clean run view | Persist and display a prominent operational warning banner with explicit counts |
| T-12-02 | Grouping and filtering replace or reorder fixed verdict-kind triage | Keep verdict kind as the outer frame and apply section or chapter grouping only inside each verdict-kind bucket |
| T-12-03 | Provenance or source-span metadata becomes opaque or unavailable until deep inspection | Project lightweight provenance into rows and richer source context into the detail panel from persisted provenance and session records |
| T-12-04 | Inspection payload leaks raw session internals, prompt artifacts, or advisory implementation details | Serialize only sanitized counts, labels, and source references while preserving hard/soft separation |

---

## Validation Sign-Off

- [x] All tasks have automated verification or Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verification.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency < 70 seconds for targeted checks.
- [x] `nyquist_compliant: true` set in frontmatter after Phase 12 validation passes.

**Approval:** approved
