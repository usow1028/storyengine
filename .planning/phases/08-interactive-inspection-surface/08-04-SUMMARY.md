---
phase: 08-interactive-inspection-surface
plan: 04
subsystem: ui
tags: [typescript, react, vite, inspection-ui, accessibility, FLOW-02]

# Dependency graph
requires:
  - phase: 08-interactive-inspection-surface
    provides: browser UI scaffold from plan 08-01
  - phase: 08-interactive-inspection-surface
    provides: run-scoped inspection DTO and API from plan 08-03
provides:
  - Split-view inspection shell
  - Fixed-order verdict triage rail
  - Deterministic verdict detail panel
  - Writer-readable evidence summaries
  - Repair candidate rendering without action controls
affects: [08-interactive-inspection-surface, inspection-ui, FLOW-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - React component composition over the run inspection DTO
    - CSS-only responsive split layout
    - Static React server-render tests for UI contract checks

key-files:
  created:
    - src/ui/components/InspectionShell.tsx
    - src/ui/components/VerdictTriageList.tsx
    - src/ui/components/VerdictDetailPanel.tsx
    - src/ui/components/EvidenceSummary.tsx
    - src/ui/components/RepairCandidates.tsx
    - src/ui/styles.css
    - tests/ui/inspection-shell.test.ts
  modified:
    - src/ui/App.tsx
    - src/ui/inspection-client.ts
    - src/ui/main.tsx
    - src/ui/types.ts

key-decisions:
  - "Use the 08-03 domain DTO as the browser type source through type-only exports."
  - "Keep the first loaded screen as the inspection console, with triage and detail visible together on desktop."
  - "Render repair candidates as ranked suggestions with no apply, accept, rewrite, or generation controls."

patterns-established:
  - "InspectionShell owns selectedVerdictId and falls back to the first verdict in the first non-empty group."
  - "Verdict rows are native buttons with aria-current for the selected row."
  - "Evidence and repair text render as normal React text nodes with no HTML injection."

requirements-completed: [FLOW-02]

# Metrics
duration: 11min
completed: 2026-04-10
---

# Phase 08 Plan 04: Split Verdict Inspection UI Summary

**A browser inspection console with grouped verdict triage, deterministic detail, evidence summaries, and repair suggestions**

## Performance

- **Duration:** 11 min
- **Started:** 2026-04-10T10:07:00Z
- **Completed:** 2026-04-10T10:18:00Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Replaced the loaded-state placeholder list with `InspectionShell`, which renders `Inspection Console`, run metadata, fixed triage, and selected detail.
- Added `VerdictTriageList` with all four verdict kinds in the API-delivered order, visible zero-count groups, 44px row targets, and `aria-current` selected state.
- Added `VerdictDetailPanel` with `Deterministic Verdict` before `Evidence Summary` and `Repair Candidates`.
- Added writer-readable evidence rendering for event, state, and rule summaries without HTML injection.
- Added ranked repair candidate rendering with repair kind, direction, confidence band, source finding IDs, and plausibility adjustment.
- Added `src/ui/styles.css` with the UI-SPEC responsive split layout, 64px header, 360px triage rail, 860px stacking breakpoint, max 8px radius, and fixed font sizes.
- Added a static React rendering regression test for the loaded inspection shell contract.

## Task Commits

1. **Split-view inspection UI** - `b98f205` (feat)
2. **Inspection shell rendering test** - `1e374d4` (test)

## Files Created/Modified

- `src/ui/components/InspectionShell.tsx` - Owns selected verdict state, run metadata, split layout, and fallback selection.
- `src/ui/components/VerdictTriageList.tsx` - Renders grouped verdict buttons, counts, labels, and selected state.
- `src/ui/components/VerdictDetailPanel.tsx` - Renders selected deterministic verdict truth before evidence and repairs.
- `src/ui/components/EvidenceSummary.tsx` - Renders writer-readable event, state, and rule evidence.
- `src/ui/components/RepairCandidates.tsx` - Renders ranked repair suggestions without action controls.
- `src/ui/styles.css` - Implements the approved manual CSS layout and responsive rules.
- `src/ui/App.tsx` - Routes loaded data into `InspectionShell` while preserving empty/loading/error copy.
- `src/ui/inspection-client.ts` - Keeps returning `RunInspectionResponse` and uses lowercase JSON accept header.
- `src/ui/main.tsx` - Imports the UI stylesheet.
- `src/ui/types.ts` - Re-exports the final inspection DTO types from the domain layer.
- `tests/ui/inspection-shell.test.ts` - Verifies triage/detail order, default selected state, and absence of blocked controls in rendered markup.

## Decisions Made

- The browser UI imports final DTO types from `src/domain/index.ts` using type-only exports instead of duplicating the 08-03 schema in the client.
- The detail panel intentionally stops at deterministic evidence and repair candidates; timeline, structured trace, and advisory bands remain for Plan 08-05.
- Repair suggestions are displayed as read-only direction text with no operation controls.

## Deviations from Plan

None. `src/ui/styles.css` was listed by the plan and did not exist yet, so it was created as the first manual UI stylesheet.

## Issues Encountered

- The required blocked-word grep initially matched the HTTP `Accept` header key in `inspection-client.ts`. The header key was changed to lowercase `accept`, which is equivalent for HTTP and keeps the production grep clean.

## Verification

- `npm run test -- tests/ui/inspection-shell.test.ts` - PASS, 1 test.
- `npm run typecheck` - PASS.
- `npm run build:ui` - PASS.
- `rg "dangerouslySetInnerHTML|innerHTML" src/ui tests/ui` - PASS, no matches.
- `rg "Apply|Accept|Rewrite|Auto-fix|snapshotDir|snapshotSet|genreWeights|worldProfile" src/ui tests/ui` - PASS, no matches.
- `rg "Hard Contradiction|Repairable Gap|Soft Drift|Consistent|aria-current" src/ui/components/VerdictTriageList.tsx` - PASS.
- `rg "Deterministic Verdict|Evidence Summary|Repair Candidates" src/ui/components` - PASS.
- `rg "@media|max-width: 860px|font-size: calc|vw" src/ui/styles.css` - PASS for media rules and no `font-size: calc` or `vw` font sizing.

## Known Stubs

None. No TODO/FIXME/placeholder text was added to touched source files.

## Threat Flags

None. T-08-14 through T-08-18 were handled by React text-node rendering, deterministic-first structure, DTO IDs/reason codes in visible rows, stable responsive layout, and no raw prior/config field exposure.

## User Setup Required

None.

## Next Phase Readiness

Plan 08-05 can add the event timeline, structured trace, and advisory pattern signal using the existing selected verdict detail branches without changing the triage/detail shell.

---
*Phase: 08-interactive-inspection-surface*
*Completed: 2026-04-10*

## Self-Check: PASSED

- Created UI component files, stylesheet, test file, and this summary.
- Task commits exist: `b98f205` and `1e374d4`.
- Required verification passed: UI test, typecheck, UI build, HTML injection grep, blocked-control/raw-field grep, required-label grep, and responsive CSS grep.
