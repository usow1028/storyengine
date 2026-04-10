---
phase: 01-canonical-narrative-schema
plan: 02
subsystem: database
tags: [postgres, pg, pg-mem, provenance, repository]
requires:
  - phase: 01-01
    provides: canonical domain schemas and schema invariants
provides:
  - PostgreSQL canonical schema and migration source of truth
  - Repositories for stories, rules, verdicts, and provenance
  - Persistence round-trip tests backed by pg-mem
affects: [phase-03-evidence-and-repair-reasoning, phase-05-natural-language-ingestion]
tech-stack:
  added: [pg, pg-mem]
  patterns: [sql-migration-as-source-of-truth, repository-round-trip-validation]
key-files:
  created:
    - src/storage/schema.ts
    - src/storage/migrations/0001_canonical_core.sql
    - src/storage/repositories/story-repository.ts
    - src/storage/repositories/rule-repository.ts
    - src/storage/repositories/verdict-repository.ts
    - src/storage/repositories/provenance-repository.ts
    - tests/storage/persistence.test.ts
  modified:
    - package.json
    - package-lock.json
    - src/domain/ids.ts
key-decisions:
  - "Use PostgreSQL DDL plus repository modules as the operational source of truth instead of graph-first persistence."
  - "Keep migration SQL as the canonical schema source and test that storage metadata stays aligned with it."
  - "Round-trip storage behavior with pg-mem so persistence tests run locally without an external database."
patterns-established:
  - "Repository methods validate canonical inputs before persistence."
  - "Reasoning-critical identifiers remain relational, while flexible extension data stays in bounded jsonb columns."
requirements-completed: [DATA-01, MODEL-02, MODEL-03, MODEL-04]
duration: 9 min
completed: 2026-04-09
---

# Phase 01 Plan 02: Canonical Narrative Schema Summary

**PostgreSQL canonical schema, provenance-aware repositories, and pg-mem round-trip tests for story revisions, rules, and verdicts**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-09T06:27:00Z
- **Completed:** 2026-04-09T06:36:30Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- Added the first canonical storage schema and SQL migration for StoryGraph
- Implemented repositories that persist story graphs, rule metadata and versions, verdicts, and provenance
- Proved storage round-trips with local pg-mem integration tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Define the relational canonical storage schema** - `fa50d74` (chore)
2. **Task 2: Implement repository boundaries for stories, rules, verdicts, and provenance** - `6e63c42` (feat)
3. **Task 3: Add persistence round-trip coverage for canonical fixtures** - `a8ad16a` (test)

**Plan metadata:** pending

## Files Created/Modified
- `src/storage/migrations/0001_canonical_core.sql` - operational DDL for stories, revisions, entities, events, rules, verdicts, and provenance
- `src/storage/schema.ts` - typed schema metadata and migration loader
- `src/storage/repositories/story-repository.ts` - save/load round-trip for story revisions, boundaries, events, and causal links
- `src/storage/repositories/rule-repository.ts` - separation of rule metadata and executable rule versions
- `src/storage/repositories/verdict-repository.ts` - verdict persistence with evidence payloads
- `src/storage/repositories/provenance-repository.ts` - provenance persistence and owner lookup
- `tests/storage/persistence.test.ts` - pg-mem-backed persistence verification

## Decisions Made
- Kept PostgreSQL migration SQL as the persistence source of truth and made the TypeScript schema layer read from it
- Used repository boundaries instead of free-form query helpers so future services can work against stable persistence contracts
- Chose pg-mem for local persistence tests to avoid making Phase 1 depend on a live database service

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Simplified branded ID aliases to executable string identifiers**
- **Found during:** Task 1 (Define the relational canonical storage schema)
- **Issue:** The earlier branded ID types created friction across persistence fixtures and repository calls, preventing straightforward execution and test authoring
- **Fix:** Reduced canonical ID aliases to validated strings while keeping the Zod ID schemas as the validation gate
- **Files modified:** `src/domain/ids.ts`
- **Verification:** `npm run typecheck` and `npx vitest run tests/storage/persistence.test.ts` both passed after the change
- **Committed in:** `fa50d74` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No scope creep. The adjustment preserved validation semantics while making the storage layer executable.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
The storage layer now round-trips canonical facts, so Plan 03 can focus on deterministic state reconstruction rather than persistence plumbing.
No blockers for Plan 03.

## Self-Check: PASSED

---
*Phase: 01-canonical-narrative-schema*
*Completed: 2026-04-09*
