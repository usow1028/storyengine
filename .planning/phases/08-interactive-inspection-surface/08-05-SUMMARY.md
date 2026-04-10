---
phase: 08-interactive-inspection-surface
plan: 05
subsystem: ui
tags: [typescript, react, vite, inspection-ui, traceability, soft-priors, FLOW-02]

# Dependency graph
requires:
  - phase: 08-interactive-inspection-surface
    provides: split verdict inspection UI from plan 08-04
provides:
  - Ordered event timeline inside selected verdict details
  - Collapsed-by-default structured trace fields
  - Bounded long trace arrays with show-more control
  - Separate soft-prior advisory pattern signal band
affects: [08-interactive-inspection-surface, inspection-ui, FLOW-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - React text-node rendering for trace and advisory data
    - Defensive-copy sorting for DTO timeline events
    - Local component state for bounded trace expansion

key-files:
  created:
    - src/ui/components/EvidenceTimeline.tsx
    - src/ui/components/TraceFields.tsx
    - src/ui/components/SoftPriorAdvisoryBand.tsx
  modified:
    - src/ui/components/VerdictDetailPanel.tsx
    - src/ui/styles.css
    - tests/ui/inspection-shell.test.ts

key-decisions:
  - "Keep deterministic verdict and evidence above timeline, trace, repairs, and advisory content."
  - "Render advisory output as a separate pattern-signal band with mandatory hard/soft boundary copy."
  - "Use a semantic ordered list for the timeline instead of graph, canvas, or pan/zoom UI."

patterns-established:
  - "EvidenceTimeline sorts a defensive copy of DTO timeline items by sequence."
  - "TraceFields starts collapsed and limits long arrays to six rows before Show More Trace Fields."
  - "SoftPriorAdvisoryBand renders sanitized advisory fields only and avoids raw prior configuration fields."

requirements-completed: [FLOW-02]

# Metrics
duration: 4min
completed: 2026-04-10
---

# Phase 08 Plan 05: Trace and Advisory UI Summary

**Selected verdict details now expose timeline-first traceability and a separate advisory pattern signal**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-10T10:20:00Z
- **Completed:** 2026-04-10T10:24:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added `EvidenceTimeline`, which renders `Event Timeline` as a semantic ordered list sorted by `sequence` from a defensive DTO copy.
- Added `TraceFields`, which starts collapsed, toggles with `Show Structured Trace` / `Hide Structured Trace`, exposes all required trace field families, and gates long arrays behind `Show More Trace Fields`.
- Added `SoftPriorAdvisoryBand`, which renders `Advisory Pattern Signal` separately from deterministic verdict evidence and repair candidates.
- Added mandatory hard/soft boundary copy: `Pattern signal only. Hard verdict remains deterministic.`
- Added unavailable-state copy: `Pattern signal unavailable. Deterministic verdict still applies.`
- Wired timeline, trace, repairs, and advisory into `VerdictDetailPanel` in deterministic-first order.
- Extended the static UI regression test to cover timeline ordering, collapsed trace entry point, unavailable advisory copy, available advisory contribution rendering, and raw-field redaction.
- Updated CSS for timeline connector strokes, trace controls, focus rings, bounded expansion, and advisory section structure without graph-first UI.

## Task Commits

1. **Failing trace/advisory tests** - `6e9ee11` (test)
2. **Trace and advisory UI** - `5826a77` (feat)

## Files Created/Modified

- `src/ui/components/EvidenceTimeline.tsx` - Renders sorted timeline events, event IDs, sequence, linked state boundary IDs, and linked rule version IDs.
- `src/ui/components/TraceFields.tsx` - Renders collapsed-by-default structured trace fields with bounded long arrays.
- `src/ui/components/SoftPriorAdvisoryBand.tsx` - Renders available and unavailable advisory pattern-signal data with boundary copy.
- `src/ui/components/VerdictDetailPanel.tsx` - Composes timeline, trace, repairs, and advisory below deterministic evidence.
- `src/ui/styles.css` - Adds timeline, trace, and advisory styling with stable dimensions and focus states.
- `tests/ui/inspection-shell.test.ts` - Adds regression coverage for timeline ordering and advisory rendering.

## Decisions Made

- The timeline is intentionally a semantic list, not a graph visualization, because graph-first interaction is explicitly deferred.
- Trace arrays are expanded by component state and do not change layout width.
- Advisory contribution rendering excludes prior configuration/raw corpus fields and keeps deterministic verdict copy authoritative.

## Deviations from Plan

None.

## Issues Encountered

- The first TDD run failed as expected because `SoftPriorAdvisoryBand` did not exist yet.
- A broad grep over both `src/ui` and `tests/ui` finds `worldProfile` inside typed test fixture input. Production `src/ui` grep is clean, which satisfies the production-surface guardrail.

## Verification

- `npm run test -- tests/ui/inspection-shell.test.ts` - PASS, 2 tests.
- `npm run typecheck && npm run build:ui` - PASS.
- `rg "@xyflow|reactflow|cytoscape|canvas" package.json src/ui` - PASS, no matches.
- `rg "sourceWorkIds|snapshotDir|snapshotSet" src/ui` - PASS, no matches.
- `rg "dangerouslySetInnerHTML|innerHTML" src/ui` - PASS, no matches.
- `rg "verdict truth|correction|applied|sourceWorkIds|snapshotDir|snapshotSet" src/ui/components/SoftPriorAdvisoryBand.tsx` - PASS, no matches.
- `rg "Apply|Accept|Rewrite|Auto-fix|sourceWorkIds|snapshotDir|snapshotSet|genreWeights|worldProfile" src/ui` - PASS, no matches.
- `rg "font-size: calc|vw" src/ui/styles.css` - PASS, no matches.

## Known Stubs

None. No TODO/FIXME/placeholder text was added to touched source files.

## Threat Flags

None. T-08-19 through T-08-23 were handled through separate advisory hierarchy, explicit trace fields, six-row trace limits, production raw-field grep checks, and React text-node rendering.

## User Setup Required

None.

## Next Phase Readiness

Plan 08-06 can serve the inspection shell from the API process and validate browser behavior against the completed UI composition.

---
*Phase: 08-interactive-inspection-surface*
*Completed: 2026-04-10*

## Self-Check: PASSED

- Created the three required components and wired them through `VerdictDetailPanel`.
- Task commits exist: `6e9ee11` and `5826a77`.
- Required verification passed: focused UI test, typecheck, UI build, graph-first grep, production raw-field grep, HTML injection grep, advisory label grep, blocked-control/raw-config production grep, and viewport-font grep.
