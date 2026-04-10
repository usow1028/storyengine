---
phase: 08
slug: interactive-inspection-surface
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-10
---

# Phase 08 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Unit/API framework** | Vitest 3.2.4 |
| **Browser framework** | Playwright via `@playwright/test` |
| **Config files** | `vitest.config.ts`, `vite.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm run typecheck && npm run test -- tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts` |
| **Browser run command** | `npm run test:browser` |
| **Full suite command** | `npm run typecheck && npm run test && npm run build && npm run test:browser` |
| **Estimated runtime** | <60 seconds for focused Vitest/API checks; browser gate varies with Chromium install state |

---

## Sampling Rate

- **After every task commit:** Run `npm run typecheck` plus the task's focused Vitest or Playwright command.
- **After every plan wave:** Run `npm run typecheck && npm run test`; once static UI routing exists, also run `npm run test:browser`.
- **Before `/gsd-verify-work`:** Run `npm run typecheck && npm run test && npm run build && npm run test:browser`.
- **Max feedback latency:** 60 seconds for focused service/API tests; browser smoke may exceed this on first browser install only.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | FLOW-02 | T-08-05 / T-08-06 | UI/browser tooling is explicit, reproducible, and does not depend on transitive Vite or manual browser checks. | config/build | `npm run typecheck && npm run build:ui` | W0 creates `vite.config.ts`, `playwright.config.ts`, `src/ui/` | pending |
| 08-01-02 | 01 | 1 | FLOW-02 | T-08-01 / T-08-02 / T-08-04 | Inspection API returns a sanitized run-scoped DTO instead of raw storage rows or prior artifacts. | service/API | `npm run test -- tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts` | W0 creates tests and route/service files | pending |
| 08-01-03 | 01 | 1 | FLOW-02 | T-08-02 / T-08-03 | Hard verdict fields, repair suggestions, and soft-prior advisory data remain structurally separate. | schema/API regression | `npm run test -- tests/api/inspection-api.test.ts` | W0 creates API test | pending |
| 08-02-01 | 02 | 2 | FLOW-02 | T-08-03 / T-08-07 | Browser split view starts from grouped triage and preserves detail context during selection. | UI/browser | `npm run test:browser -- --grep "grouped verdict"` | W0 creates browser test | pending |
| 08-02-02 | 02 | 2 | FLOW-02 | T-08-02 / T-08-03 | Evidence timeline exposes event/state/rule trace fields without using raw prose-only explanations. | service/UI/browser | `npm run test -- tests/services/inspection-payload.test.ts && npm run test:browser -- --grep "evidence timeline"` | W0 creates service and browser tests | pending |
| 08-02-03 | 02 | 2 | FLOW-02 | T-08-02 / T-08-05 / T-08-08 | Fastify serves the built inspection shell under `/inspection/` without shadowing `/api/` routes or leaking raw prior config. | static/API/browser | `npm run build && npm run test:browser` | W0 creates static route and browser test | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Coverage Resolution

- [x] `vite.config.ts` is assigned to Task `08-01-01`.
- [x] `playwright.config.ts` is assigned to Task `08-01-01`.
- [x] `src/ui/` browser shell and components are assigned to Tasks `08-01-01`, `08-02-01`, `08-02-02`, and `08-02-03`.
- [x] `src/api/routes/inspection.ts` is assigned to Task `08-01-02`.
- [x] `src/services/inspection-payload.ts` is assigned to Tasks `08-01-02` and `08-02-02`.
- [x] `tests/services/inspection-payload.test.ts` is assigned to Tasks `08-01-02` and `08-02-02`.
- [x] `tests/api/inspection-api.test.ts` is assigned to Tasks `08-01-02` and `08-01-03`.
- [x] `tests/browser/inspection-surface.spec.ts` is assigned to Tasks `08-02-01`, `08-02-02`, and `08-02-03`.
- [x] `package.json` scripts `build:ui`, `test:browser`, and build integration are assigned to Tasks `08-01-01` and `08-02-03`.
- [x] Playwright browser installation is assigned to Task `08-01-01` or documented as a user setup step if the executor cannot install browsers in the current environment.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| First-run Chromium installation | FLOW-02 | Browser binaries may require network or environment-specific cache permissions. | If `npm run test:browser` reports missing browsers, run `npx playwright install chromium`, then rerun `npm run test:browser`. |

All product behaviors must have automated validation; the manual item above is only environment setup recovery.

---

## Validation Sign-Off

- [x] All planned task categories have automated verify commands.
- [x] Sampling continuity: no task category lacks automated feedback.
- [x] Wave 0 maps every missing Phase 8 test/config/UI file to an executable task.
- [x] No watch-mode flags.
- [x] Hard/soft separation and raw prior redaction are explicit validation targets.
- [x] Browser verification is required for phase completion.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** planning artifact ready for planner and checker
