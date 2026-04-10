---
phase: 09
slug: draft-container-and-segment-scope-model
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 09 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test:ingestion` |
| **Full suite command** | `npm run typecheck && npm run test:ingestion` |
| **Estimated runtime** | ~10-30 seconds locally |

---

## Sampling Rate

- **After every task commit:** Run `npm run typecheck` plus the touched targeted Vitest file.
- **After every plan wave:** Run `npm run test:ingestion`.
- **Before `/gsd-verify-work`:** Run `npm run typecheck && npm run test:ingestion`; run `npm test` if shared domain exports beyond ingestion are touched.
- **Max feedback latency:** 30 seconds for targeted commands where practical.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | DRAFT-01, DRAFT-03 | T-09-01 / T-09-02 | Zod validates draft identity, source refs, and scope ranges before persistence/API use | unit | `npm exec -- vitest run tests/domain/drafts.test.ts --bail=1` | no - Wave 0 creates | pending |
| 09-01-02 | 01 | 1 | DRAFT-01, DRAFT-03 | T-09-02 | Deterministic segment planning preserves LF-normalized source offsets and compatibility output | unit | `npm exec -- vitest run tests/services/natural-language-extraction.test.ts --bail=1` | yes | pending |
| 09-02-01 | 02 | 2 | DRAFT-01, DRAFT-03 | T-09-01 / T-09-03 | SQL persistence uses parameterized queries and preserves draft/scope metadata round trips | storage | `npm exec -- vitest run tests/storage/ingestion-session-repository.test.ts --bail=1` | yes | pending |
| 09-03-01 | 03 | 3 | DRAFT-01, DRAFT-03 | T-09-03 / T-09-04 | API serialization exposes additive draft fields while retaining existing compatibility fields | API | `npm exec -- vitest run tests/api/ingestion-review-api.test.ts tests/api/check-controls-api.test.ts --bail=1` | yes | pending |

*Status: pending until execution creates/extends the listed tests.*

---

## Wave 0 Requirements

- [ ] `tests/domain/drafts.test.ts` - create schema tests for `DraftDocument`, `DraftRevision`, `DraftSection`, `DraftSourceTextRef`, and `DraftCheckScope`.
- [ ] `tests/services/natural-language-extraction.test.ts` - extend with CRLF offset, chapter heading, blank-line block, and sentence-window fallback fixtures.
- [ ] `tests/storage/ingestion-session-repository.test.ts` - extend with draft table/column/scope round trips through pg-mem.
- [ ] `tests/api/ingestion-review-api.test.ts` - extend with additive submit/read response assertions while preserving existing fields.

---

## Manual-Only Verifications

All Phase 9 behaviors have automated verification paths. No manual-only checks are required unless a later plan introduces external database migration verification.

---

## Threat References

| Threat | Risk | Required Mitigation |
|--------|------|---------------------|
| T-09-01 | Malformed draft/scope metadata enters storage | Shared Zod schemas validate IDs, source refs, section order, and scope shape |
| T-09-02 | Source offsets drift after CRLF normalization | Store explicit source text normalization and test source slices against the normalized text basis |
| T-09-03 | Additive SQL changes break old ingestion sessions | New columns are nullable or compatibility-synthesized; existing ingestion tests remain green |
| T-09-04 | API response breaks existing clients | Existing top-level `sessionId`, `workflowState`, `storyId`, `revisionId`, and `segments` fields remain present |

---

## Validation Sign-Off

- [ ] All tasks have automated verification or Wave 0 dependencies.
- [ ] Sampling continuity: no 3 consecutive tasks without automated verification.
- [ ] Wave 0 covers all missing references.
- [ ] No watch-mode flags.
- [ ] Feedback latency < 30 seconds for targeted checks.
- [ ] `nyquist_compliant: true` set in frontmatter after Phase 9 validation passes.

**Approval:** pending
