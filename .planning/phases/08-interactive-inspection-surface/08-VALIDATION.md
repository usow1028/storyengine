---
phase: 08
slug: interactive-inspection-surface
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-10
updated: 2026-04-10
---

# Phase 08 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Revised after checker scope blockers to match plans 08-01 through 08-06.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Unit/API framework** | Vitest 3.2.4 |
| **Browser framework** | Playwright via `@playwright/test` |
| **Config files** | `vitest.config.ts`, `vite.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm run typecheck && npm run test -- tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts` |
| **Browser run command** | `npm run build && npm run test:browser` |
| **Full suite command** | `npm run typecheck && npm run test && npm run build && npm run test:browser` |
| **Estimated runtime** | <60 seconds for focused Vitest/API checks; browser gate varies with Chromium install state |

---

## Sampling Rate

- **After every task commit:** Run `npm run typecheck` plus the task's focused Vitest, build, or Playwright command.
- **After Wave 1:** Run `npm run typecheck && npm run build:ui && npm run test -- tests/storage/verdict-run-inspection-snapshot.test.ts tests/engine/verdict-runner.test.ts`.
- **After Wave 2:** Run `npm run typecheck && npm run test -- tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts`.
- **After Waves 3 and 4:** Run `npm run typecheck && npm run build:ui` plus the grep gates listed in the plan verification sections.
- **After Wave 5:** Run `npm run build && npm run test:browser`.
- **Before `/gsd-verify-work`:** Run `npm run typecheck && npm run test && npm run build && npm run test:browser`.
- **Max feedback latency:** 60 seconds for focused service/API tests; browser smoke may exceed this on first browser install only.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | FLOW-02 | T-08-03 / T-08-04 | UI/browser tooling is explicit, reproducible, direct, and not dependent on transitive Vite or manual browser checks. | config/build | `npm run typecheck && npm run build:ui` | W0 creates `vite.config.ts`, `playwright.config.ts`, `index.html` | pending |
| 08-01-02 | 01 | 1 | FLOW-02 | T-08-01 / T-08-02 | Minimal shell parses run routes, fetches the inspection API, and renders approved empty/error/loading copy without unsafe HTML. | UI build | `npm run typecheck && npm run build:ui` | W0 creates `src/ui/main.tsx`, `src/ui/App.tsx`, `src/ui/inspection-client.ts`, `src/ui/types.ts` | pending |
| 08-02-01 | 02 | 1 | FLOW-02 | T-08-05 / T-08-07 / T-08-08 | Inspection domain schemas include snapshot and response DTO contracts while redacting raw prior artifacts. | storage/schema | `npm run test -- tests/storage/verdict-run-inspection-snapshot.test.ts` | W0 creates `src/domain/inspection.ts`, migration, storage test | pending |
| 08-02-02 | 02 | 1 | FLOW-02 | T-08-06 / T-08-07 | Verdict runner persists sanitized snapshots after hard verdict persistence while preserving hard verdict invariance. | runtime regression | `npm run test -- tests/engine/verdict-runner.test.ts` | W0 creates `src/services/inspection-payload.ts` snapshot helper | pending |
| 08-03-01 | 03 | 2 | FLOW-02 | T-08-10 / T-08-11 / T-08-13 | DTO composer groups verdicts, exposes traceable detail, uses stored snapshots, and does not recompute prior advisory data on read. | service | `npm run test -- tests/services/inspection-payload.test.ts` | W0 creates `tests/services/inspection-payload.test.ts` | pending |
| 08-03-02 | 03 | 2 | FLOW-02 | T-08-09 / T-08-10 / T-08-12 | Inspection API returns sanitized run-scoped JSON with stable 404 handling and no raw prior/server config exposure. | API | `npm run typecheck && npm run test -- tests/api/inspection-api.test.ts` | W0 creates `src/api/routes/inspection.ts`, API test | pending |
| 08-04-01 | 04 | 3 | FLOW-02 | T-08-16 / T-08-18 | Loaded DTO flows into split shell and keeps run metadata compact without prior config exposure. | UI build | `npm run typecheck && npm run build:ui` | W0 creates `src/ui/components/InspectionShell.tsx` | pending |
| 08-04-02 | 04 | 3 | FLOW-02 | T-08-14 / T-08-15 / T-08-17 | Triage/detail UI starts from grouped verdicts, preserves selected context, and renders evidence/repairs as text-only suggestions. | UI build/accessibility | `npm run typecheck && npm run build:ui` | W0 creates triage/detail/evidence/repair components | pending |
| 08-05-01 | 05 | 4 | FLOW-02 | T-08-20 / T-08-21 / T-08-23 | Timeline and trace interactions expose structured evidence while collapsing long trace arrays and avoiding unsafe HTML. | UI interaction build | `npm run typecheck && npm run build:ui` | W0 creates `EvidenceTimeline.tsx`, `TraceFields.tsx` | pending |
| 08-05-02 | 05 | 4 | FLOW-02 | T-08-19 / T-08-22 / T-08-23 | Advisory pattern signal is visually and semantically separate from deterministic verdict truth and redacts raw prior data. | UI interaction build | `npm run typecheck && npm run build:ui` | W0 creates `SoftPriorAdvisoryBand.tsx` | pending |
| 08-06-01 | 06 | 5 | FLOW-02 | T-08-24 / T-08-27 | Fastify serves built UI under `/inspection/` without shadowing `/api/inspection/*` and uses a seeded real app boundary for browser tests. | static/server | `npm run build` | W0 creates `src/api/routes/inspection-ui.ts`, browser test server | pending |
| 08-06-02 | 06 | 5 | FLOW-02 | T-08-25 / T-08-26 / T-08-28 | Playwright verifies the real browser inspection path, hard/soft separation, traceability, route separation, and raw prior redaction. | browser | `npm run build && npm run test:browser` | W0 creates `tests/browser/inspection-surface.spec.ts` | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Coverage Resolution

- [x] `package.json` direct dependencies and scripts are assigned to Task `08-01-01`.
- [x] `package-lock.json` dependency resolution is assigned to Task `08-01-01`.
- [x] `tsconfig.json` JSX and TSX include changes are assigned to Task `08-01-01`.
- [x] `vite.config.ts` is assigned to Task `08-01-01`.
- [x] `playwright.config.ts` is created in Task `08-01-01` and finalized in Task `08-06-01`.
- [x] `index.html` is assigned to Task `08-01-01`.
- [x] Minimal shell files `src/ui/main.tsx`, `src/ui/App.tsx`, `src/ui/inspection-client.ts`, and `src/ui/types.ts` are assigned to Task `08-01-02`.
- [x] `src/ui/styles.css` is assigned to Plan `08-04`, keeping Plan `08-01` below the file-count warning threshold.
- [x] `src/domain/inspection.ts` and `src/domain/index.ts` are assigned to Task `08-02-01`.
- [x] `src/storage/migrations/0004_verdict_run_inspection_snapshot.sql` is assigned to Task `08-02-01`.
- [x] `VerdictRunRepository` snapshot methods are assigned to Task `08-02-01`.
- [x] Verdict-runner snapshot persistence and `createRunInspectionSnapshot` are assigned to Task `08-02-02`.
- [x] `tests/storage/verdict-run-inspection-snapshot.test.ts` is assigned to Task `08-02-01`.
- [x] `tests/engine/verdict-runner.test.ts` snapshot regressions are assigned to Task `08-02-02`.
- [x] `buildRunInspectionPayload` and `tests/services/inspection-payload.test.ts` are assigned to Task `08-03-01`.
- [x] `src/api/routes/inspection.ts`, `src/api/schemas.ts`, `src/api/app.ts`, and `tests/api/inspection-api.test.ts` are assigned to Task `08-03-02`.
- [x] Split-view components `InspectionShell`, `VerdictTriageList`, `VerdictDetailPanel`, `EvidenceSummary`, and `RepairCandidates` are assigned to Tasks `08-04-01` and `08-04-02`.
- [x] Timeline/trace/advisory components `EvidenceTimeline`, `TraceFields`, and `SoftPriorAdvisoryBand` are assigned to Tasks `08-05-01` and `08-05-02`.
- [x] Fastify static route `src/api/routes/inspection-ui.ts` and `inspectionUiDistDir` app wiring are assigned to Task `08-06-01`.
- [x] `tests/browser/inspection-test-server.ts` is assigned to Task `08-06-01`.
- [x] `tests/browser/inspection-surface.spec.ts` is assigned to Task `08-06-02`.
- [x] Playwright browser installation recovery is documented below as environment setup only; product behavior remains covered by `npm run test:browser`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| First-run Chromium installation | FLOW-02 | Browser binaries may require network or environment-specific cache permissions. | If `npm run test:browser` reports missing browsers, run `npx playwright install chromium`, then rerun `npm run test:browser`. |

All product behaviors have automated validation; the manual item above is only environment setup recovery.

---

## Security and Redaction Gates

Run these gates before phase verification:

```bash
npm run typecheck && npm run test && npm run build && npm run test:browser
rg "evaluateConfiguredSoftPrior|evaluateSoftPriors|loadPriorSnapshot" src/services/inspection-payload.ts src/api/routes/inspection.ts
rg "dangerouslySetInnerHTML|innerHTML" src/ui
rg "@xyflow|reactflow|cytoscape" package.json src/ui
rg "sourceWorkIds|snapshotDir|snapshotSet" src/api src/services/inspection-payload.ts src/domain/inspection.ts src/ui tests/browser
```

Expected results:
- The first command exits 0.
- The prior recomputation grep returns no matches.
- The unsafe HTML grep returns no matches.
- The graph-library grep returns no matches.
- The raw prior grep shows only negative test assertions or safe fixture setup, not production browser/API exposure.

---

## Validation Sign-Off

- [x] All planned task categories have automated verify commands.
- [x] Sampling continuity: no task category lacks automated feedback.
- [x] Wave 0 maps every missing Phase 8 test/config/UI/API/storage file to an executable task.
- [x] No watch-mode flags.
- [x] Hard/soft separation and raw prior redaction are explicit validation targets.
- [x] Browser verification is required for phase completion.
- [x] New plan split keeps each plan under the checker file-count threshold.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** revised planning artifact ready for checker
