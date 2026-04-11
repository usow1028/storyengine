# Phase 11: Scoped Checks and Revision Diff - Research

**Researched:** 2026-04-11
**Domain:** approved-scope execution, scope-event resolution, deterministic cross-run diffing, finding-level trace labeling
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

Source: [CITED: .planning/phases/11-scoped-checks-and-revision-diff/11-CONTEXT.md]

### Locked Decisions

#### Scope Reference Contract
- **D-01:** Scoped check and scoped diff requests must use persisted `scopeId` values. Phase 11 must not accept inline scope objects in the public contract.

#### Scoped Check Eligibility
- **D-02:** A scoped check may run when every segment in the requested scope is `approved` and `stale === false`. The rest of the session does not need to be fully approved.
- **D-03:** Scoped checks stay fail-closed. If the requested scope contains any unapproved, stale, failed, or unresolved segment, the request returns an explicit conflict instead of silently shrinking scope.

#### Diff Baseline and Comparison Inputs
- **D-04:** The default diff baseline remains the immediate `previousRunId` chain.
- **D-05:** Phase 11 must also support explicit comparison targets, including a caller-specified base run or base revision.

#### Cross-Revision Matching
- **D-06:** Cross-revision diffing may use only deterministic persisted identity such as `scopeId` or a stable section-derived identity key. No `sourceTextRef` overlap heuristics or fuzzy matching are allowed in Phase 11.

#### Diff and Trace Output
- **D-07:** Diff responses must include finding-level trace information, not only run-level summary counts.
- **D-08:** Diff trace payload stays leaner than a full inspection dump. Include identifiers such as `findingId`, `verdictKind`, `scopeId`, relevant segment/source references, and `ruleVersionId`, but do not inline full evidence by default.

#### Existing Boundaries to Preserve
- **D-09:** Hard verdict truth and soft-prior advisory output remain separate in scoped checks.
- **D-10:** Phase 11 extends the existing `submit -> extract -> review -> approve -> check` model. Scoped checks are a narrower execution target, not a new workflow family.

### Claude's Discretion

- Exact route and DTO names, as long as `scopeId` remains the public scope selector.
- Exact persistence shape for verdict-run scope metadata, as long as downstream diff logic can resolve comparable scopes deterministically.
- Exact diff envelope shape, as long as finding-level trace stays available and explicit.

### Deferred Ideas (OUT OF SCOPE)

- Fuzzy `sourceTextRef` overlap matching across revisions.
- Best-effort partial checks that auto-drop unresolved segments.
- Full inspection-snapshot evidence dumps inside diff responses.
- Browser-heavy grouping/filtering for large-run inspection payloads.
- Queue-backed or asynchronous scoped-check orchestration.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DRAFT-02 | Engine can compare consistency across multiple revisions of a longer draft. | Run metadata must persist a deterministic scope identity key so revision-level comparison can find a comparable prior run without fuzzy text matching. [CITED: .planning/REQUIREMENTS.md] [CITED: .planning/phases/11-scoped-checks-and-revision-diff/11-CONTEXT.md] [VERIFIED: src/domain/drafts.ts] [VERIFIED: src/storage/repositories/verdict-run-repository.ts] |
| CHECK-01 | User can run consistency checks against an explicit approved scope, including full approved draft, chapter, or segment range. | Scoped execution must resolve a persisted `scopeId`, validate the referenced segments are all approved/current, derive in-scope event membership, and retain only scope-anchored verdicts while preserving full-graph deterministic context. [CITED: .planning/REQUIREMENTS.md] [CITED: .planning/phases/11-scoped-checks-and-revision-diff/11-CONTEXT.md] [VERIFIED: src/services/ingestion-check.ts] [VERIFIED: src/domain/drafts.ts] |
| DIFF-01 | User can compare verdict output between runs or revisions with added, resolved, persisted, and changed findings labeled by scope. | `diffAgainstPreviousRun()` already computes the four core change classes, but it must be generalized to accept explicit base selectors and emit scope-labeled finding items instead of only ID arrays. [CITED: .planning/REQUIREMENTS.md] [VERIFIED: src/services/verdict-diff.ts] [VERIFIED: tests/engine/verdict-diff.test.ts] |
| TRACE-01 | Every verdict, repair, and diff item remains traceable to canonical IDs, rule IDs, and original draft source spans. | Existing verdict evidence already carries `findingId`, event/state/rule/provenance IDs, and inspection payloads already expose trace fields; Phase 11 should reuse that structure for diff items instead of inventing opaque summaries. [CITED: .planning/REQUIREMENTS.md] [VERIFIED: src/domain/verdicts.ts] [VERIFIED: src/domain/inspection.ts] [VERIFIED: src/services/inspection-payload.ts] |
</phase_requirements>

## Summary

Phase 11 is not a brand-new reasoning engine. The core deterministic checker already exists, and Phase 10 already made approval partial, explicit, and fail-closed at the segment level. The missing layer is the ability to resolve a stored draft scope into a safe canonical event set, execute a verdict run that remembers which scope it represents, and diff that run against either the immediate prior run or an explicitly chosen comparable revision/run. [VERIFIED: src/services/ingestion-check.ts] [VERIFIED: src/services/verdict-runner.ts] [VERIFIED: src/services/verdict-diff.ts] [VERIFIED: src/services/inspection-payload.ts]

The critical design constraint is that cross-revision comparison cannot rely on fuzzy overlap. Current `scopeId` and `sectionId` values are session-generated, so they are good for same-revision execution but not by themselves sufficient for cross-revision comparability. The correct Phase 11 answer is to persist both the raw `scopeId` and a deterministic `comparisonScopeKey` derived from stable scope identity, such as `documentId` plus section sequence/kind for section scopes or `documentId` plus segment sequence bounds for deterministic ranges. That keeps same-revision execution exact while allowing safe cross-revision diff lookup without heuristics. [VERIFIED: src/domain/drafts.ts] [VERIFIED: src/services/ingestion-session.ts] [CITED: .planning/phases/11-scoped-checks-and-revision-diff/11-CONTEXT.md]

The second critical constraint is that scoped checks must be truly scoped without breaking deterministic classification. Running the full revision and merely attaching a `scopeId` label would fail CHECK-01, but physically truncating the graph would also risk false positives by removing prior context. The better Phase 11 pattern is: resolve the requested scope to deterministic in-scope event IDs from approved segment candidates, evaluate the existing deterministic engine against the full revision graph, then persist and inspect only verdicts whose anchor event belongs to that scope. Supporting evidence may still reference outside events or state boundaries, which preserves explanation quality and keeps hard-verdict logic unchanged. Soft priors stay advisory and separate exactly as they do today. [CITED: .planning/phases/11-scoped-checks-and-revision-diff/11-CONTEXT.md] [VERIFIED: src/services/ingestion-review.ts] [VERIFIED: src/services/verdict-runner.ts] [VERIFIED: src/services/explained-verdicts.ts]

## Project Constraints (from AGENTS.md)

- Explainability is non-negotiable. Phase 11 must keep every scoped check and diff traceable to explicit IDs and source references, not opaque summaries. [CITED: AGENTS.md]
- Deterministic judgment remains logic-led. Scoped execution may change the graph slice, but not the verdict algorithm or hard-verdict authority. [CITED: AGENTS.md]
- Natural-language ingestion stays normalized into structured representations first; Phase 11 operates on persisted draft scopes and promoted canonical data, not on raw text heuristics. [CITED: AGENTS.md]
- File-changing work must remain inside the GSD workflow; this research document is the plan-phase artifact for that workflow. [CITED: AGENTS.md]

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | `5.9.3` installed `[VERIFIED: package.json][VERIFIED: npm ls]` | Scope metadata, diff contracts, and run-selection logic need strict typed schemas. | Existing domain, service, and repository layers are already TypeScript-first, so Phase 11 should extend those contracts instead of introducing a sidecar implementation. |
| Zod | `4.3.6` installed `[VERIFIED: package.json][VERIFIED: npm ls]` | Validate scoped check request bodies, diff query selectors, run metadata, and diff-item DTOs. | Current API/domain boundaries are Zod-first and additive. [VERIFIED: src/api/schemas.ts] |
| Fastify | `5.8.4` installed `[VERIFIED: package.json][VERIFIED: npm ls]` | Keep scoped check and inspection diff entrypoints thin while pushing stateful validation into services. | Current routes already follow the thin-wrapper pattern. [VERIFIED: src/api/routes/ingestion-check.ts] [VERIFIED: src/api/routes/inspection.ts] |
| pg / pg-mem | current repo baseline `[VERIFIED: package.json][VERIFIED: npm ls]` | Persist scope-aware verdict-run metadata and verify repository behavior without an external database. | Existing verdict-run and inspection tests already use the same storage layer. [VERIFIED: tests/engine/verdict-diff.test.ts] [VERIFIED: tests/storage/verdict-run-inspection-snapshot.test.ts] |
| Vitest | `3.2.4` installed `[VERIFIED: package.json][VERIFIED: npm ls]` | Regression-test scope gating, explicit diff selection, trace labeling, and inspection payload behavior. | Phase 11 changes are mostly deterministic service/storage/API logic and fit the current Vitest matrix well. [VERIFIED: package.json] |

### Installation

No new package is recommended. Phase 11 fits the current dependency set and should avoid dependency churn.

```bash
npm install
```

## Architecture Patterns

### Recommended Project Structure

```text
src/
├── domain/
│   ├── verdicts.ts                 # scope-aware verdict run metadata
│   └── inspection.ts               # finding-level diff items and selector schemas
├── services/
│   ├── ingestion-check.ts          # scope resolution + scope-local approval validation
│   ├── verdict-runner.ts           # execute full-graph verdict runs and persist only scope-anchored results
│   ├── verdict-diff.ts             # explicit base run/revision selection + finding-level diff items
│   └── inspection-payload.ts       # inspection diff payload normalization for scoped runs
├── storage/
│   ├── migrations/0007_scoped_verdict_runs.sql
│   └── repositories/
│       └── verdict-run-repository.ts
└── api/
    ├── routes/ingestion-check.ts   # optional scopeId check requests
    ├── routes/inspection.ts        # explicit base run/base revision selectors
    └── schemas.ts                  # scoped check and diff request/response DTOs
tests/
├── services/scoped-ingestion-check.test.ts
├── engine/verdict-diff.test.ts
├── services/inspection-payload.test.ts
├── api/check-controls-api.test.ts
└── api/inspection-api.test.ts
```

### Pattern 1: Persist Raw Scope Metadata Plus Deterministic Comparison Key

**What:** Extend `verdict_runs` so each run can persist both the exact scope selected at execution time and a normalized comparison key used for safe cross-revision lookup. Recommended fields are `scope_id`, `scope_kind`, `comparison_scope_key`, and `scope_payload JSONB`. [VERIFIED: src/storage/migrations/0002_verdict_runs.sql] [VERIFIED: src/storage/repositories/verdict-run-repository.ts]

**Why:** Raw `scopeId` is exact for same-session execution, but current generated IDs are session-based and not guaranteed stable across revisions. A separate `comparisonScopeKey` lets Phase 11 match only deterministic equivalents such as `full:{documentId}`, `section:{documentId}:{sectionKind}:{sequence}`, or `range:{documentId}:{sectionKey}:{startSequence}:{endSequence}`. This satisfies D-06 without fuzzy matching. [VERIFIED: src/domain/drafts.ts] [VERIFIED: src/services/ingestion-session.ts] [CITED: .planning/phases/11-scoped-checks-and-revision-diff/11-CONTEXT.md]

**Example:**

```sql
ALTER TABLE verdict_runs
  ADD COLUMN IF NOT EXISTS scope_id TEXT,
  ADD COLUMN IF NOT EXISTS scope_kind TEXT,
  ADD COLUMN IF NOT EXISTS comparison_scope_key TEXT,
  ADD COLUMN IF NOT EXISTS scope_payload JSONB;

CREATE INDEX IF NOT EXISTS verdict_runs_story_scope_created_idx
  ON verdict_runs (story_id, comparison_scope_key, created_at);
```

### Pattern 2: Resolve Scope to Approved/Current Segment Set Before Any Execution

**What:** `executeIngestionCheck()` should accept an optional `scopeId`, resolve it from the session snapshot's persisted `checkScopes`, expand that scope to concrete segment IDs, and reject unless every segment in that set is `approved`, has non-null `approvedAt`, and `stale === false`. [VERIFIED: src/services/ingestion-check.ts] [VERIFIED: src/domain/drafts.ts]

**Why:** This is the actual CHECK-01 gate. It also preserves the fail-closed rule from Phase 10 instead of silently shrinking the scope to only safe segments. [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md] [CITED: .planning/phases/11-scoped-checks-and-revision-diff/11-CONTEXT.md]

**Recommendation:** Keep the existing `/check` mental model and extend the request body additively to `{ scopeId?: string }`. No scopeId means full-session check; scopeId means scoped check with scope-local gating.

### Pattern 3: Resolve Scope To Canonical Event Membership, Then Retain Only In-Scope Verdicts

**What:** After scope resolution, derive the set of canonical event IDs that came from approved segment candidates inside that scope. Then keep `evaluateRevision()` running against the full revision graph, but persist and diff only verdicts whose anchor event belongs to that in-scope event set. [VERIFIED: src/services/verdict-runner.ts] [VERIFIED: src/services/explained-verdicts.ts] [VERIFIED: src/services/ingestion-review.ts]

**Why:** This preserves deterministic classification because the engine still sees full prior context, but it also makes the run genuinely scoped because only verdicts anchored to the selected scope are stored and compared. Raw-text overlap is still avoided, and Phase 11 does not need to invent a second reasoning mode. [CITED: .planning/phases/11-scoped-checks-and-revision-diff/11-CONTEXT.md]

**Implementation shape:** Introduce a helper that:
- resolves the requested scope to concrete segment IDs,
- extracts canonical event IDs from approved normalized event candidates in those segments,
- passes that event-ID set into `executeVerdictRun()`,
- retains only verdicts whose primary event belongs to the in-scope set while allowing supporting evidence to reference outside context.

### Pattern 4: Generalize Diffing to Explicit Base Selectors Without Losing Previous-Run Default

**What:** Replace the current previous-run-only function with a generalized selector, for example `diffVerdictRuns({ currentRunId, baseRunId?, baseRevisionId? ... })`, and keep `previousRunId` as the default when no explicit selector is provided. [VERIFIED: src/services/verdict-diff.ts]

**Why:** D-04 and D-05 require both behaviors. The explicit selector path should choose:
- `baseRunId` when provided,
- otherwise the latest comparable run in `baseRevisionId` using the current run's `comparisonScopeKey`,
- otherwise `currentRun.previousRunId`.

**Important:** If the requested base revision has no comparable run for the same deterministic scope identity, return an explicit conflict or not-found error. Do not silently choose a whole-revision run or a differently scoped run.

### Pattern 5: Reuse Inspection Trace Vocabulary for Finding-Level Diff Items

**What:** Extend inspection/domain DTOs with diff items that reuse existing trace field vocabulary instead of inventing a second trace model. Each diff item should minimally include:
- `changeKind` (`added`, `resolved`, `persisted`, `changed_supporting`),
- `findingId`,
- `verdictKind`,
- `scopeId`,
- `comparisonScopeKey`,
- `segmentIds`,
- `sourceTextRefs` or equivalent scope-local source refs,
- `ruleVersionIds`,
- representative checker/reason code.

[VERIFIED: src/domain/inspection.ts] [VERIFIED: src/services/inspection-payload.ts]

**Why:** `InspectionTraceFieldsSchema` already captures the trace contract Phase 11 needs. Reusing that shape reduces schema drift and preserves TRACE-01. [VERIFIED: src/domain/inspection.ts]

### Pattern 6: Keep Soft-Prior Advisory Separate From Deterministic Diff Truth

**What:** Scoped checks should still return `softPrior` advisory blocks, but diff identity and change classification must be computed from persisted deterministic verdicts only. [VERIFIED: src/services/verdict-runner.ts] [VERIFIED: src/services/inspection-payload.ts]

**Why:** D-09 explicitly preserves the hard/soft separation. The current inspection payload already keeps advisory alongside deterministic verdict details rather than merging them, and Phase 11 should preserve that boundary. [CITED: .planning/phases/07-soft-prior-runtime-integration/07-CONTEXT.md] [CITED: .planning/phases/11-scoped-checks-and-revision-diff/11-CONTEXT.md]

## Anti-Patterns to Avoid

- **Full-revision execution with only a scope label attached and no verdict filtering:** this would pass metadata around but would not actually satisfy CHECK-01. [CITED: .planning/REQUIREMENTS.md]
- **Cross-revision fallback based on `sourceTextRef` overlap or text similarity:** explicitly disallowed by D-06. [CITED: .planning/phases/11-scoped-checks-and-revision-diff/11-CONTEXT.md]
- **Silently dropping unresolved segments from a requested scope:** violates the fail-closed check contract. [CITED: .planning/phases/11-scoped-checks-and-revision-diff/11-CONTEXT.md]
- **Returning entire inspection snapshots inside every diff item:** exceeds D-08 and bloats the API unnecessarily. [VERIFIED: src/domain/inspection.ts]
- **Using soft-prior adjustments to decide diff identity or change class:** diff truth must come from deterministic verdict records only. [VERIFIED: src/services/verdict-runner.ts]

## Common Pitfalls

### Pitfall 1: Session-Generated Scope IDs Are Treated As Revision-Stable
**What goes wrong:** A later revision cannot find a comparable prior scope because the stored `scopeId` was derived from `sessionId` and changed across submissions. [VERIFIED: src/services/ingestion-session.ts]
**How to avoid:** Persist raw `scopeId` for exact same-session references, but also persist a deterministic `comparisonScopeKey` derived from document/section/range identity.

### Pitfall 2: Scoped Check Validates Scope Existence But Persists Whole-Revision Verdicts
**What goes wrong:** The API reports a scoped run, but the stored verdict set still contains out-of-scope anchor events.
**How to avoid:** Resolve scope membership to canonical event IDs and retain only verdicts whose anchor event belongs to that set, while still letting supporting evidence reference outside context.

### Pitfall 3: Explicit Base Revision Chooses An Incompatible Run
**What goes wrong:** Cross-revision diff accidentally compares a chapter-level run against a whole-draft run.
**How to avoid:** Require matching `comparisonScopeKey` (or an equivalent deterministic identity) before selecting a base run.

### Pitfall 4: Diff Trace Drops Source-Level IDs
**What goes wrong:** The response can say a finding changed, but cannot connect that change back to draft segments, rules, or provenance.
**How to avoid:** Build diff items from verdict evidence and persisted scope metadata, not from post-hoc summary strings.

## Code Examples

### Scope-Aware Check Request

```typescript
export const CheckIngestionRequestSchema = z
  .object({
    scopeId: z.string().trim().min(1).optional()
  })
  .default({});

const body = CheckIngestionRequestSchema.parse(request.body ?? {});
const result = await executeIngestionCheck(sessionId, {
  ...dependencies,
  scopeId: body.scopeId
});
```

### Comparison Key Builder

```typescript
function buildComparisonScopeKey(scope: DraftCheckScope): string {
  switch (scope.scopeKind) {
    case "full_approved_draft":
      return `full:${scope.documentId}`;
    case "section":
      return `section:${scope.documentId}:${resolveStableSectionKey(scope)}`;
    case "segment_range":
      return `range:${scope.documentId}:${resolveStableRangeContainerKey(scope)}:${scope.startSequence}:${scope.endSequence}`;
  }
}
```

The section/range implementation should use revision-stable identity derived from persisted document or section structure, not raw session-generated IDs; the important point is that the key must be deterministic and must not rely on fuzzy overlap. [CITED: .planning/phases/11-scoped-checks-and-revision-diff/11-CONTEXT.md]

### Generalized Diff Selector

```typescript
const diff = await diffVerdictRuns({
  currentRunId,
  baseRunId,
  baseRevisionId,
  verdictRepository,
  verdictRunRepository
});
```

## Assumptions Log

없음. 이 문서는 현재 코드, 현재 phase context, current requirements/roadmap, 그리고 공식 문서에서 바로 검증 가능한 사실만 사용했고, 권고안은 그 근거에서 직접 도출했다. [VERIFIED: src/domain/drafts.ts] [VERIFIED: src/services/ingestion-check.ts] [VERIFIED: src/services/verdict-diff.ts] [VERIFIED: src/services/inspection-payload.ts]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `3.2.4` installed. `[VERIFIED: package.json][VERIFIED: npm ls]` |
| Config file | `vitest.config.ts` `[VERIFIED: vitest.config.ts]` |
| Quick run command | `npm exec -- vitest run tests/services/scoped-ingestion-check.test.ts tests/storage/verdict-run-inspection-snapshot.test.ts tests/engine/verdict-diff.test.ts tests/services/inspection-payload.test.ts tests/api/check-controls-api.test.ts tests/api/inspection-api.test.ts --bail=1` |
| Full suite command | `npm run typecheck && npm run test:reasoning && npm run test:ingestion && npm exec -- vitest run tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts --bail=1` |
| Estimated runtime | ~25-45 seconds locally |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DRAFT-02 | comparable scoped runs can diff across revisions using deterministic identity | engine + service | `npm exec -- vitest run tests/engine/verdict-diff.test.ts tests/services/inspection-payload.test.ts --bail=1` | ✅ existing files extendable |
| CHECK-01 | scoped checks run only when requested scope segments are approved/current and resolvable | service + API | `npm exec -- vitest run tests/services/scoped-ingestion-check.test.ts tests/api/check-controls-api.test.ts --bail=1` | ❌ new service file, API file exists |
| DIFF-01 | added/resolved/persisted/changed findings are labeled by scope and explicit base selectors | engine + API | `npm exec -- vitest run tests/engine/verdict-diff.test.ts tests/api/inspection-api.test.ts --bail=1` | ✅ existing files extendable |
| TRACE-01 | diff items preserve canonical IDs, rule IDs, provenance/source context, and scope identity | service + API | `npm exec -- vitest run tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts --bail=1` | ✅ existing files extendable |

### Sampling Rate

- **After every task commit:** run `npm run typecheck` plus the touched targeted Vitest files.
- **After every plan wave:** run the quick command above or the smallest relevant subset plus `npm run typecheck`.
- **Before `/gsd-verify-work`:** run the full suite command exactly.
- **Max feedback latency:** 45 seconds for targeted checks where practical.

### Wave 0 Gaps

- [ ] `tests/services/scoped-ingestion-check.test.ts` — new service coverage for scope resolution, fail-closed approval validation, and scoped run metadata.
- [ ] Extend `tests/storage/verdict-run-inspection-snapshot.test.ts` — persist and reload `scopeId`, `scopeKind`, `comparisonScopeKey`, and `scopePayload`.
- [ ] Extend `tests/engine/verdict-diff.test.ts` — explicit `baseRunId` / `baseRevisionId` selection, incompatible-scope rejection, and scope-labeled finding items.
- [ ] Extend `tests/services/inspection-payload.test.ts` — finding-level diff trace items remain lean and advisory-separated.
- [ ] Extend `tests/api/check-controls-api.test.ts` — `scopeId` request semantics and scoped 409 behavior.
- [ ] Extend `tests/api/inspection-api.test.ts` — explicit comparison selectors and inspection diff labels.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | yes | Interpret scope execution as workflow-state authorization: only approved/current segments inside the requested scope may participate in a scoped check. |
| V5 Input Validation | yes | Use Zod for structural request parsing and service-layer logic for scope existence, comparability, and approval/current-state checks. |
| V8 Data Protection | yes | Keep diff output lean and traceable; do not leak full inspection snapshots or internal config blobs through diff responses. |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unapproved or stale scope executes | Tampering | Resolve scope to concrete segments and require all of them to be approved/current before execution. |
| Cross-revision diff compares incompatible scopes | Integrity | Match only by exact `baseRunId` or deterministic `comparisonScopeKey`; fail closed otherwise. |
| Diff output loses traceability | Repudiation | Build diff items from persisted verdict evidence plus scope metadata, not summary strings. |
| Advisory prior output contaminates hard diff truth | Integrity | Compute diff classes from deterministic verdict records only and serialize soft priors separately. |
