---
phase: 12-large-run-inspection-and-operational-guardrails
plan: 01
subsystem: inspection
tags: [inspection, provenance, operational-summary, zod, vitest]
requires:
  - phase: 11-scoped-checks-and-revision-diff
    provides: scoped verdict runs, comparisonScopeKey persistence, and additive inspection diff contracts
  - phase: 10-incremental-extraction-and-review-resilience
    provides: mixed-state ingestion workflow states, segment provenance detail, and approved/current review semantics
provides:
  - additive inspection DTO fields for scope summary, operational summary, grouping metadata, and source context
  - run-time persistence of sanitized operational summary alongside inspection snapshots
  - provenance-backed payload enrichment for section grouping and row/detail source metadata
affects: [inspection-payload, verdict-runner, ingestion-check, inspection-api, provenance-repository]
tech-stack:
  added: []
  patterns:
    - persist operational warning counts with the run and resolve row/detail provenance lazily from stored provenance plus ingestion-session metadata
    - keep inspection response additive so existing groups/details consumers remain valid while large-run metadata becomes available
key-files:
  created: []
  modified:
    - src/domain/inspection.ts
    - src/services/inspection-payload.ts
    - src/services/verdict-runner.ts
    - src/services/ingestion-check.ts
    - src/storage/repositories/provenance-repository.ts
    - src/api/routes/inspection.ts
    - tests/services/inspection-payload.test.ts
    - tests/api/inspection-api.test.ts
key-decisions:
  - "Run-level scope summary comes from persisted verdict-run scope metadata, while operational summary is captured at check time and stored with the run snapshot."
  - "Row/detail provenance is resolved from stored provenance ids back to ingestion-session segment and section metadata instead of inventing UI-only labels."
  - "The public inspection route stays additive and sanitized: counts, labels, and source spans are exposed without leaking raw session snapshots or artifact paths."
patterns-established:
  - "Large-run inspection metadata is additive and nullable, not a breaking replacement for the existing response contract."
  - "Operational honesty is tied to the inspected run by snapshot persistence, while section/chapter grouping is derived from persisted provenance and draft structure."
requirements-completed: [DRAFT-03, INSPECT-01, TRACE-01, OPER-01, REVIEW-02]
duration: 28 min
completed: 2026-04-11
---

# Phase 12 Plan 01: Inspection Payload Foundation Summary

**Large-run inspection payloads now expose run scope, partial-state warning counts, and provenance-backed section grouping without replacing deterministic verdict output**

## Performance

- **Duration:** 28 min
- **Started:** 2026-04-11T10:24:14Z
- **Completed:** 2026-04-11T10:52:09Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Closed the Wave 0 contract by making the seeded service/API regressions pass for `scopeSummary`, `operationalSummary`, `secondaryGroup`, `provenanceSummary`, and `sourceContext`.
- Extended the inspection domain and payload builder additively so run metadata, row metadata, and detail metadata can all carry large-run context without disturbing existing deterministic groups or advisory separation.
- Persisted sanitized operational summary data at check time and wired the inspection API to resolve provenance-backed chapter or segment context from stored provenance plus ingestion-session snapshots.

## Task Commits

1. **Task 12-01-01: Extend Wave 0 inspection payload and API regressions** - `e80363a` (test, pre-seeded on the branch before execution began)
2. **Task 12-01-02: Expand inspection schemas and snapshot contract additively** - `59e1e44` (`feat(12-01): enrich inspection payload metadata`)
3. **Task 12-01-03: Build provenance-backed grouping and warning summaries in the inspection payload** - `59e1e44` (`feat(12-01): enrich inspection payload metadata`)

## Files Created/Modified

- `src/domain/inspection.ts` - Adds additive run, row, and detail metadata schemas for large-run inspection.
- `src/services/inspection-payload.ts` - Resolves scope summary, operational summary, secondary grouping, provenance summary, and detail source context.
- `src/services/verdict-runner.ts` - Persists optional `operationalSummary` into inspection snapshots.
- `src/services/ingestion-check.ts` - Computes sanitized operational warning counts from session state at check time.
- `src/storage/repositories/provenance-repository.ts` - Adds batch provenance lookup for inspection payload enrichment.
- `src/api/routes/inspection.ts` - Threads ingestion-session and provenance repositories into the inspection payload builder.
- `tests/services/inspection-payload.test.ts` - Seeds mixed-state session/provenance fixtures and proves additive service DTO behavior.
- `tests/api/inspection-api.test.ts` - Proves the enriched public inspection response remains additive and sanitized.

## Decisions Made

- Kept `scopeSummary`, `operationalSummary`, `secondaryGroup`, `provenanceSummary`, and `sourceContext` optional additive fields so existing fixtures and consumers remain compatible.
- Used persisted provenance ids as the only bridge from verdicts back to session/segment/section context, then sanitized the resolved output down to labels, review state, and source spans.
- Stored operational warning counts with the run snapshot instead of recomputing them at inspection-read time from potentially drifted live session state.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added check-time operational summary computation and repository batch lookup to support the additive payload contract**
- **Found during:** Tasks 12-01-02 and 12-01-03
- **Issue:** The original file list did not include `src/services/ingestion-check.ts` or `src/storage/repositories/provenance-repository.ts`, but the payload contract could not be made durable or provenance-backed without those support changes.
- **Fix:** Added check-time operational summary generation in `executeIngestionCheck()` and added `getByIds()` to `ProvenanceRepository` so inspection payload enrichment can resolve stored provenance deterministically.
- **Files modified:** `src/services/ingestion-check.ts`, `src/storage/repositories/provenance-repository.ts`
- **Verification:** `npm exec -- vitest run tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts --bail=1 && npm run typecheck`
- **Committed in:** `59e1e44`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No scope change. The additional support wiring was necessary to satisfy the persistence and provenance guarantees already required by Plan 12-01.

## Verification

- `npm exec -- vitest run tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts --bail=1`
- `npm run typecheck`
- `node .codex/get-shit-done/bin/gsd-tools.cjs verify key-links .planning/phases/12-large-run-inspection-and-operational-guardrails/12-01-PLAN.md`

## Next Phase Readiness

- Phase 12 Plan 02 can now treat the inspection payload as the single source of truth for grouped triage, global filters, and warning-banner rendering.
- The browser/UI wave no longer needs ad-hoc provenance heuristics because row/detail context now arrives directly from the API payload.

## Self-Check: PASSED

- Verified `.planning/phases/12-large-run-inspection-and-operational-guardrails/12-01-SUMMARY.md` exists.
- Verified task commits `e80363a` and `59e1e44` exist in `git log --oneline --all`.
- Verified service/API payload regressions, typecheck, and key-link checks all passed.

---
*Phase: 12-large-run-inspection-and-operational-guardrails*
*Completed: 2026-04-11*
