---
phase: 04-corpus-priors-and-soft-pattern-layer
plan: 01
subsystem: data
tags: [duckdb, priors, corpus, zod, vitest]
requires:
  - phase: 03-evidence-and-repair-reasoning
    provides: structured verdict and repair contracts consumed by later soft-prior runtime work
provides:
  - Canonical corpus intake contracts for curated works, scene rows, and prior snapshots
  - Offline normalization and prior snapshot build/export pipeline
  - Deterministic corpus fixtures and regression tests for baseline and genre exports
affects: [soft-prior runtime scoring, repair plausibility reranking, phase-04-02]
tech-stack:
  added: [tsx]
  patterns: [versioned prior snapshots, canonical corpus normalization, offline export artifacts]
key-files:
  created:
    [
      src/domain/priors.ts,
      src/corpus/types.ts,
      src/corpus/normalization.ts,
      src/corpus/prior-build.ts,
      scripts/build-priors.ts,
      tests/corpus/corpus-normalization.test.ts,
      tests/corpus/prior-build.test.ts
    ]
  modified: [src/domain/index.ts, src/corpus/index.ts, package.json, package-lock.json]
key-decisions:
  - "Prior snapshots stay immutable and versioned, with baseline and genre exports separated by artifact filename."
  - "Corpus normalization targets canonical event/state/world-rule tokens instead of inventing a corpus-only schema."
  - "Build-time prior generation uses an offline script path and does not query analytics state at runtime."
patterns-established:
  - "Pattern 1: curated corpus works normalize into transition observations before any aggregation."
  - "Pattern 2: export artifacts group snapshots by layer/file while preserving per-world-profile entries."
requirements-completed: [DATA-02]
duration: 19min
completed: 2026-04-09
---

# Phase 04: Corpus Priors and Soft Pattern Layer Summary

**Versioned baseline and genre prior snapshots built from canonicalized corpus transitions with deterministic export artifacts**

## Performance

- **Duration:** 19 min
- **Started:** 2026-04-09T12:18:00Z
- **Completed:** 2026-04-09T12:37:00Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- Added explicit prior-domain schemas for corpus metadata, normalized transition patterns, drift patterns, and snapshot artifacts.
- Implemented canonical corpus normalization plus offline snapshot build/export logic with a dedicated `build:priors` command.
- Added deterministic fixtures and regressions covering normalization, baseline/genre separation, snapshot IDs, `sampleCount`, and export filenames.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define corpus and prior snapshot contracts** - `3f4905b` (feat)
2. **Task 2: Implement canonical corpus normalization and offline snapshot build pipeline** - `c96d141` (feat)
3. **Task 3: Add deterministic corpus-build fixtures and regressions** - `91d36fb` (test)

## Files Created/Modified
- `src/domain/priors.ts` - Prior layers, world profiles, normalized pattern schemas, and snapshot artifact helpers
- `src/corpus/types.ts` - Curated corpus work, scene row, event row, state transition, and rule-exception contracts
- `src/corpus/normalization.ts` - Canonical corpus transition/work normalization into event/state/world-rule tokens
- `src/corpus/prior-build.ts` - Snapshot aggregation and export artifact generation
- `scripts/build-priors.ts` - Offline prior export command writing into `data/prior-snapshots/`
- `tests/fixtures/corpus-prior-fixtures.ts` - Deterministic reality-default and override-heavy corpus works
- `tests/corpus/corpus-normalization.test.ts` - Normalization regressions for canonical tokens and world-rule exceptions
- `tests/corpus/prior-build.test.ts` - Snapshot/export regressions for baseline and genre prior artifacts
- `package.json` - Added `build:priors`

## Decisions Made

- Used a single canonical `genreKey` serializer so snapshot IDs, export filenames, and later runtime lookup all share the same key space.
- Grouped baseline exports into one `baseline.prior.json` artifact and genre exports into `genre-<key>.prior.json` artifacts while keeping per-world-profile snapshots inside each artifact.
- Inferred drift seeds from preconditions, motivation-sensitive state axes, and world-rule exceptions so Phase 4 can keep positive priors and drift priors separate from the start.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `tsx` for the offline build command**
- **Found during:** Task 2 (Implement canonical corpus normalization and offline snapshot build pipeline)
- **Issue:** `build:priors` required direct TypeScript execution, but the workspace had no loader capable of resolving the repo's `.js` specifiers from TypeScript sources.
- **Fix:** Added `tsx` as a dev dependency and wired `build:priors` through `node --loader tsx`.
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** `npm run typecheck` passed after the dependency install and the script target resolved cleanly.
- **Committed in:** `c96d141` (part of task commit)

---

**Total deviations:** 1 auto-fixed (Rule 3: 1)
**Impact on plan:** No scope creep. The deviation was required to make the planned offline export command executable.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Baseline and genre prior artifacts now have stable contracts and deterministic fixtures. Phase 04-02 can load these snapshots at runtime, compute layer-aware soft drift scores, and rerank repairs without redefining the export format.

---
*Phase: 04-corpus-priors-and-soft-pattern-layer*
*Completed: 2026-04-09*
