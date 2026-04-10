---
phase: 08-interactive-inspection-surface
plan: 06
subsystem: api-ui-browser
tags: [typescript, fastify, react, vite, playwright, inspection-ui, FLOW-02]

# Dependency graph
requires:
  - phase: 08-interactive-inspection-surface
    provides: run-scoped inspection API DTO from plan 08-03
  - phase: 08-interactive-inspection-surface
    provides: trace/advisory inspection UI from plan 08-05
provides:
  - Fastify-served inspection UI under /inspection/
  - Seeded Playwright test server backed by real repositories and executeVerdictRun
  - Chromium browser verification for inspection console behavior
  - Static/API route separation checks for /inspection and /api/inspection
affects: [08-interactive-inspection-surface, api, inspection-ui, browser-tests, FLOW-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Optional Fastify static route registration from StoryGraphApiDependencies
    - Playwright webServer command using the built UI and seeded API process
    - Browser tests that fetch both HTML and JSON through the served boundary

key-files:
  created:
    - src/api/routes/inspection-ui.ts
    - tests/browser/inspection-test-server.ts
    - tests/browser/inspection-surface.spec.ts
  modified:
    - src/api/app.ts

key-decisions:
  - "Register inspection UI routes only when `inspectionUiDistDir` is provided."
  - "Serve Vite assets under `/inspection/assets/` and HTML only under `/inspection` and `/inspection/runs/:runId`."
  - "Seed browser verification through repositories and `executeVerdictRun` instead of importing React components."

patterns-established:
  - "Static browser UI serving is opt-in and does not shadow `/api/inspection/*`."
  - "Browser tests use the deterministic run ID `run:revision:test:2026-04-10T12:30:00Z`."
  - "Raw prior fields are checked in both serialized API text and rendered page text."

requirements-completed: [FLOW-02]

# Metrics
duration: 7min
completed: 2026-04-10
---

# Phase 08 Plan 06: Browser Serving and Verification Summary

**The inspection surface is now served by Fastify and verified in Chromium against a seeded real API run**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-10T12:30:00Z
- **Completed:** 2026-04-10T12:37:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added `registerInspectionUiRoutes`, which serves built Vite assets under `/inspection/assets/`.
- Added HTML shell routes for `/inspection`, `/inspection/`, and `/inspection/runs/:runId`.
- Extended `StoryGraphApiDependencies` with optional `inspectionUiDistDir` and registered the UI route only when provided.
- Added a seeded Playwright test server on `127.0.0.1:4178` that builds a pg-mem database, persists the hard-constraint fixture, creates an available soft-prior fixture, executes `executeVerdictRun`, and serves the built UI plus API.
- Added a Chromium browser spec that visits `/inspection/runs/:runId`, asserts first-screen inspection console behavior, locked verdict group order, detail selection, deterministic/evidence/timeline/repair/trace/advisory visibility, hard/soft boundary copy, raw-field redaction, and JSON/HTML route separation.

## Task Commits

1. **Inspection UI static route and test server** - `38ddba0` (feat)
2. **Chromium browser verification** - `c52f8a2` (test)

## Files Created/Modified

- `src/api/routes/inspection-ui.ts` - Fastify static asset and inspection HTML route registration.
- `src/api/app.ts` - Optional `inspectionUiDistDir` dependency and UI route wiring.
- `tests/browser/inspection-test-server.ts` - Seeded Fastify test server for Playwright.
- `tests/browser/inspection-surface.spec.ts` - Browser verification of the inspection surface and API/static boundary.
- `.planning/phases/08-interactive-inspection-surface/08-06-SUMMARY.md` - This completion summary.

## Decisions Made

- No change to `playwright.config.ts` was needed because it already used `npm run build && npm run inspection:test-server`, port `4178`, and the Chromium project.
- The static route reads `dist/ui/index.html` on request, which keeps the route simple and avoids exposing source directories.
- The browser spec duplicates the deterministic run ID instead of importing server internals, preserving the served-boundary test shape.

## Deviations from Plan

None.

## Issues Encountered

- The first browser run failed because Playwright Chromium was not installed in the environment. Ran `npx playwright install chromium` per the plan recovery note and reran the browser gate successfully.
- The first browser assertion used a broad `Conflict path` text locator and matched multiple visible strings. Narrowed it to exact text for the structured trace field.

## Verification

- `npm run build` - PASS.
- `npx playwright install chromium` - PASS, installed the required local browser runtime.
- `npm run build && npm run test:browser` - PASS, 1 Chromium test.
- `node .codex/get-shit-done/bin/gsd-tools.cjs verify key-links .planning/phases/08-interactive-inspection-surface/08-06-PLAN.md` - PASS, 3/3.
- `rg "sourceWorkIds|snapshotDir|snapshotSet" src/api src/services src/ui tests/browser` - PASS by inspection: only existing service config types plus browser negative assertions and safe fixture setup contain those names.
- `rg "from .*src/ui" tests/browser/inspection-surface.spec.ts` - PASS, no matches.

## Browser Server

- Verified URL: `http://127.0.0.1:4178/inspection/runs/run%3Arevision%3Atest%3A2026-04-10T12%3A30%3A00Z`
- API route verified separately: `http://127.0.0.1:4178/api/inspection/runs/run%3Arevision%3Atest%3A2026-04-10T12%3A30%3A00Z`

## Known Stubs

None. No TODO/FIXME/placeholder text was added to touched source files.

## Threat Flags

None. T-08-24 through T-08-28 were handled by route separation, built-dist static root scoping, served-boundary browser verification, and raw prior field redaction checks.

## User Setup Required

None for this environment after `npx playwright install chromium`.

## Next Phase Readiness

All six Phase 8 execution plans now have summaries. The phase is ready for orchestrator-level ROADMAP/STATE progress update, code-review gate, regression gate, schema-drift gate, and phase verification.

---
*Phase: 08-interactive-inspection-surface*
*Completed: 2026-04-10*

## Self-Check: PASSED

- Created the required Fastify UI route, seeded browser test server, and Playwright browser spec.
- Task commits exist: `38ddba0` and `c52f8a2`.
- Required verification passed: build, Chromium browser gate, key-link verification, raw-field grep review, and browser source-import grep.
