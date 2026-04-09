---
phase: 06
slug: verification-and-traceability-closure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | other (`rg`/doc checks) + vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `rg -n "## Requirements Coverage|## Verification Metadata" .planning/phases/01-canonical-narrative-schema/01-VERIFICATION.md .planning/phases/02-hard-constraint-engine/02-VERIFICATION.md .planning/phases/03-evidence-and-repair-reasoning/03-VERIFICATION.md .planning/phases/04-corpus-priors-and-soft-pattern-layer/04-VERIFICATION.md .planning/phases/05-natural-language-ingestion-and-review-api/05-VERIFICATION.md` |
| **Full suite command** | `npx vitest run tests/canonical/schema.test.ts tests/canonical/reconstruction.test.ts tests/storage/persistence.test.ts tests/engine/hard-constraint-engine.test.ts tests/engine/evidence-traces.test.ts tests/engine/repair-generator.test.ts tests/engine/verdict-runner.test.ts tests/engine/verdict-diff.test.ts tests/corpus/corpus-normalization.test.ts tests/corpus/prior-build.test.ts tests/api/ingestion-review-api.test.ts tests/api/check-controls-api.test.ts tests/services/ingestion-review-workflow.test.ts tests/storage/ingestion-session-repository.test.ts` |
| **Estimated runtime** | ~12 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task-specific command from the table below
- **After every plan wave:** Run the full suite command above
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | MODEL-01, MODEL-02, MODEL-03, MODEL-04, DATA-01, RULE-01, RULE-02, RULE-03, RULE-04, VERD-01, VERD-02, VERD-03, REPR-01, REPR-02 | T-06-01, T-06-02 | Verification backfill for Phases 01-03 cites only live docs/tests and does not promote summary-only claims into milestone truth | docs + regression | `npx vitest run tests/canonical/schema.test.ts tests/canonical/reconstruction.test.ts tests/storage/persistence.test.ts tests/engine/hard-constraint-engine.test.ts tests/engine/evidence-traces.test.ts tests/engine/repair-generator.test.ts tests/engine/verdict-runner.test.ts tests/engine/verdict-diff.test.ts` | ❌ Wave 0 creates `01-VERIFICATION.md`, `02-VERIFICATION.md`, `03-VERIFICATION.md` | ⬜ pending |
| 06-02-01 | 02 | 1 | DATA-02, FLOW-01, FLOW-03 | T-06-01, T-06-02 | Phase 04 and 05 verification separates offline-prior evidence from missing runtime soft-prior wiring, and `REQUIREMENTS.md` reflects verification results instead of generic pending rows | docs + integration | `npx vitest run tests/corpus/corpus-normalization.test.ts tests/corpus/prior-build.test.ts tests/api/ingestion-review-api.test.ts tests/api/check-controls-api.test.ts tests/services/ingestion-review-workflow.test.ts tests/storage/ingestion-session-repository.test.ts && rg -n "evaluateSoftPriors" src/services/soft-prior-evaluator.ts src/services/verdict-runner.ts src/services/ingestion-check.ts src/api/routes` | ❌ Wave 0 creates `04-VERIFICATION.md`, `05-VERIFICATION.md` | ⬜ pending |
| 06-03-01 | 03 | 2 | MODEL-01, MODEL-02, MODEL-03, MODEL-04, DATA-01, RULE-01, RULE-02, RULE-03, RULE-04, VERD-01, VERD-02, VERD-03, REPR-01, REPR-02, DATA-02, FLOW-01, FLOW-03 | T-06-03 | Milestone audit classifies completed phases from verification artifacts, removes orphaned verification debt, and leaves only the known Phase 7 runtime blocker | docs audit | `test -f .planning/v1.0-v1.0-MILESTONE-AUDIT.md && rg -n "01-VERIFICATION.md|02-VERIFICATION.md|03-VERIFICATION.md|04-VERIFICATION.md|05-VERIFICATION.md|SOFT-01" .planning/v1.0-v1.0-MILESTONE-AUDIT.md .planning/REQUIREMENTS.md` | ✅ `.planning/v1.0-v1.0-MILESTONE-AUDIT.md` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing Vitest infrastructure covers all runtime evidence used by this phase. Wave 0 only needs the new verification docs:

- [ ] `.planning/phases/01-canonical-narrative-schema/01-VERIFICATION.md`
- [ ] `.planning/phases/02-hard-constraint-engine/02-VERIFICATION.md`
- [ ] `.planning/phases/03-evidence-and-repair-reasoning/03-VERIFICATION.md`
- [ ] `.planning/phases/04-corpus-priors-and-soft-pattern-layer/04-VERIFICATION.md`
- [ ] `.planning/phases/05-natural-language-ingestion-and-review-api/05-VERIFICATION.md`

---

## Manual-Only Verifications

All phase behaviors have automated verification. Human review is only needed if a backfilled verification report reaches `human_needed`.

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
