# Phase 11: Scoped Checks and Revision Diff - Research

**Researched:** 2026-04-11
**Domain:** scoped manual checks, scope-aware verdict runs, and deterministic run or revision diffing
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

The subsections below are copied verbatim from `11-CONTEXT.md`. [VERIFIED: 11-CONTEXT.md]

### Locked Decisions
- **D-01:** Scoped check and scoped diff requests should reference persisted `scopeId` values only. Phase 11 should not accept inline scope objects in the public contract.
- **D-02:** A scoped check may run when the requested scope's segments are all `approved` and `current` (`stale === false`). Phase 11 should not require the entire session to be fully approved if the requested scope itself is safe.
- **D-03:** Scoped checks must remain fail-closed. If any segment inside the requested scope is unapproved, stale, failed, or otherwise unresolved, the request returns an explicit conflict instead of silently shrinking scope.
- **D-04:** The default diff baseline remains the immediately previous run, matching the existing `previousRunId` chain.
- **D-05:** Phase 11 should also support explicit diff targets when needed, such as a caller-specified base run or base revision, rather than forcing previous-run comparison only.
- **D-06:** Cross-revision diffing should only compare scopes that have deterministic persisted identity, specifically persisted `scopeId` values or stable section identity. Do not add `sourceTextRef` overlap or other best-effort matching heuristics in Phase 11.
- **D-07:** Diff responses should include finding-level trace information, not only run-level summary. Each diff item should carry enough identifiers to connect the change back to scope, canonical evidence, and source context.
- **D-08:** The required diff trace payload should stay leaner than a full inspection dump. Include identifiers such as `findingId`, `verdictKind`, `scopeId`, relevant `segmentId` or `sourceTextRef`, and `ruleVersionId`, but do not inline the full evidence payload by default.
- **D-09:** Hard verdict truth and soft-prior advisory output remain separate in scoped checks, exactly as in earlier manual checks.
- **D-10:** Phase 11 should extend the existing `submit -> extract -> review -> approve -> check` mental model. Scoped checks are a narrower execution target, not a new ingestion workflow.

### Claude's Discretion
- Exact route names and DTO field names for scoped check and diff requests, as long as persisted `scopeId` remains the public selection unit.
- Exact persistence shape for run-to-scope metadata, as long as downstream diff logic can resolve scope identity deterministically.
- Exact conflict error wording and diff response envelope shape, as long as failures remain explicit and finding-level trace fields stay available.

### Deferred Ideas (OUT OF SCOPE)
- `sourceTextRef` overlap or other best-effort cross-revision scope matching heuristics - future phase if deterministic scope identity proves too limiting.
- Full inspection-payload style evidence dumps inside diff responses - Phase 12 or later if the browser surface needs it.
- Large-run grouping, filtering, and UI-heavy diff exploration - Phase 12.
- Queue-backed or asynchronous scoped check orchestration - future work if request-time execution becomes insufficient.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DRAFT-02 | Engine can compare consistency across multiple revisions of a longer draft. [VERIFIED: REQUIREMENTS.md] | Extend diffing beyond implicit `previousRunId` by adding explicit baseline resolution for base run or base revision, but allow revision-level comparison only when both sides carry deterministic scope identity. [VERIFIED: 11-CONTEXT.md][VERIFIED: codebase grep][ASSUMED] |
| CHECK-01 | User can run consistency checks against an explicit approved scope, including full approved draft, chapter, or segment range. [VERIFIED: REQUIREMENTS.md] | Resolve persisted `scopeId` from the session snapshot, derive the exact covered segments, and validate approval or staleness only inside that scope before calling `executeVerdictRun()`. [VERIFIED: 11-CONTEXT.md][VERIFIED: codebase grep][ASSUMED] |
| DIFF-01 | User can compare verdict output between runs or revisions with added, resolved, persisted, and changed findings labeled by scope. [VERIFIED: REQUIREMENTS.md] | Extend `diffAgainstPreviousRun()` into a baseline-aware service that returns labeled diff items instead of only ID arrays, while preserving previous-run fallback. [VERIFIED: 11-CONTEXT.md][VERIFIED: codebase grep][ASSUMED] |
| TRACE-01 | Every verdict, repair, and diff item remains traceable to canonical IDs, rule IDs, and original draft source spans. [VERIFIED: REQUIREMENTS.md] | Persist scope metadata on the run at write time and return lean diff trace fields such as `findingId`, `verdictKind`, `scopeId`, `segmentId` or `sourceTextRef`, and `ruleVersionIds` without inlining full inspection evidence. [VERIFIED: 11-CONTEXT.md][VERIFIED: codebase grep][ASSUMED] |
</phase_requirements>

## Summary

Phase 11 can stay inside the existing `submit -> extract -> review -> approve -> check` architecture because the repo already centralizes request parsing in Zod schemas, uses thin Fastify routes, and runs orchestration in `src/services`. [VERIFIED: codebase grep] The concrete missing pieces are narrow and visible: `executeIngestionCheck()` still hard-requires every segment in the session to be approved and current, `executeVerdictRun()` persists no scope metadata on runs, and `diffAgainstPreviousRun()` only compares against `previousRunId` while returning finding-ID arrays instead of labeled trace objects. [VERIFIED: codebase grep]

The safest implementation path is additive: resolve `scopeId` against persisted `draft_check_scopes`, validate only the segments inside the resolved scope, persist a sanitized scope snapshot with each run, and extend diffing so it can compare either the default `previousRunId` baseline or an explicit run or revision target while echoing the resolved baseline in the response. [VERIFIED: 11-CONTEXT.md][VERIFIED: codebase grep][ASSUMED]

The main planning risk is revision identity. Default document, revision, section, and scope IDs are session-derived when callers do not provide stable IDs, so run-to-run diffing is deterministic today but revision-to-revision comparison may need explicit conflict semantics whenever comparable scope identity is missing. [VERIFIED: codebase grep][VERIFIED: 11-CONTEXT.md]

**Primary recommendation:** Implement Phase 11 as an additive extension of `executeIngestionCheck -> executeVerdictRun -> diffAgainstPreviousRun -> buildRunInspectionPayload`, persist run-scoped metadata at write time, and fail closed whenever a requested scope or revision baseline cannot be resolved deterministically. [VERIFIED: codebase grep][VERIFIED: 11-CONTEXT.md][ASSUMED]

## Project Constraints (from AGENTS.md)

- Every judgment and diff item must remain explainable and traceable to explicit states, events, rules, or missing assumptions. [VERIFIED: AGENTS.md]
- Deterministic consistency judgment must remain logic-led; soft priors may assist but must stay advisory-only. [VERIFIED: AGENTS.md]
- Natural-language draft input is only an input layer over structured internal representations, so Phase 11 should work on canonical story data and persisted draft scope metadata rather than prose-only comparisons. [VERIFIED: AGENTS.md]
- The roadmap marks Phase 11 with `UI hint: no`, so the phase should extend API, service, and storage behavior without introducing browser-heavy inspection work that belongs to Phase 12. [VERIFIED: ROADMAP.md]

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Fastify | repo pin `^5.8.4`; registry current `5.8.4` (`2026-03-23`) [VERIFIED: codebase grep][VERIFIED: npm registry] | Keep scoped check and diff routes inside the current API surface. [VERIFIED: codebase grep] | `buildStoryGraphApi()` already registers ingestion and inspection routes with Fastify, so Phase 11 does not need a new transport layer. [VERIFIED: codebase grep][CITED: https://fastify.dev/docs/latest/Reference/Routes/] |
| Zod | repo pin `^4.1.12`; registry current `4.3.6` (`2026-01-25`) [VERIFIED: codebase grep][VERIFIED: npm registry] | Model scoped check requests, explicit diff baseline DTOs, and lean trace payloads. [VERIFIED: codebase grep] | Draft scopes, verdict runs, and API responses are already Zod-first, including discriminated unions for scope kinds. [VERIFIED: codebase grep][CITED: https://zod.dev/] |
| PostgreSQL via `pg` + `pg-mem` | repo pin `pg ^8.16.3`; registry current `8.20.0`; repo pin `pg-mem ^3.0.5`; registry current `3.0.14` [VERIFIED: codebase grep][VERIFIED: npm registry] | Persist additive run metadata and keep storage tests local and deterministic. [VERIFIED: codebase grep] | Existing repository and API tests already use the same persistence layer, so scope metadata and diff baselines should extend it rather than add a second store. [VERIFIED: codebase grep] |
| Vitest | repo pin `^3.2.4`; registry current `4.1.4` (`2026-04-09`) [VERIFIED: codebase grep][VERIFIED: npm registry] | Service, repository, and API regressions for scoped checks and diffing. [VERIFIED: codebase grep] | The existing phase-relevant files already run cleanly under targeted `vitest run` commands in this checkout. [VERIFIED: local command][CITED: https://vitest.dev/guide/] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript | repo pin `^5.9.3`; registry current `6.0.2` (`2026-04-01`) [VERIFIED: codebase grep][VERIFIED: npm registry] | Keep run metadata, diff DTOs, and repository changes refactor-safe. [VERIFIED: codebase grep] | Use for every new schema, repository row, and service helper in this phase. [VERIFIED: codebase grep] |
| `tsx` | repo pin `^4.21.0`; registry current `4.21.0` (`2025-11-30`) [VERIFIED: codebase grep][VERIFIED: npm registry] | Keep existing script and test-server execution unchanged. [VERIFIED: codebase grep] | Use only if Phase 11 expands existing script-based inspection verification. [VERIFIED: codebase grep] |
| `@playwright/test` | repo pin `^1.59.1`; registry current `1.59.1` (`2026-04-11`) [VERIFIED: codebase grep][VERIFIED: npm registry] | Optional browser-level verification for inspection consumers. [VERIFIED: codebase grep] | Use only if Phase 11 changes inspection output in a way that must be checked through the browser shell; roadmap still keeps the phase UI-light. [VERIFIED: ROADMAP.md][ASSUMED] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Additive `verdict_runs` metadata plus existing inspection payload flow [VERIFIED: codebase grep][ASSUMED] | A separate scope-run or diff-history subsystem [ASSUMED] | A separate subsystem gives future query flexibility, but the repo already stores run-adjacent JSON inspection state on `verdict_runs`, so a new subsystem would add migration and lookup complexity without clear Phase 11 value. [VERIFIED: codebase grep][ASSUMED] |
| Reusing the current Fastify plus Zod API surface [VERIFIED: codebase grep] | Introducing a new schema provider or route framework [ASSUMED] | A new framework would broaden the phase beyond its scoped-check and diff goal and break the repo's existing route pattern. [VERIFIED: codebase grep][ASSUMED] |
| Explicit baseline fields with `previous_run` default [VERIFIED: 11-CONTEXT.md][ASSUMED] | Previous-run-only diffing [VERIFIED: codebase grep] | Previous-run-only is simpler, but it does not satisfy `D-05` or `DIFF-01` because callers sometimes need explicit run or revision baselines. [VERIFIED: 11-CONTEXT.md] |

**Installation:**
```bash
# No new packages are recommended for Phase 11.
# Keep the existing Fastify + Zod + pg/pg-mem + Vitest stack.
```

**Version verification:**
- `fastify` current `5.8.4` modified `2026-03-23`; repo pin `^5.8.4`. [VERIFIED: npm registry][VERIFIED: codebase grep]
- `zod` current `4.3.6` modified `2026-01-25`; repo pin `^4.1.12`. [VERIFIED: npm registry][VERIFIED: codebase grep]
- `vitest` current `4.1.4` modified `2026-04-09`; repo pin `^3.2.4`. [VERIFIED: npm registry][VERIFIED: codebase grep]
- `pg` current `8.20.0` modified `2026-03-04`; repo pin `^8.16.3`. [VERIFIED: npm registry][VERIFIED: codebase grep]
- `pg-mem` current `3.0.14` modified `2026-02-26`; repo pin `^3.0.5`. [VERIFIED: npm registry][VERIFIED: codebase grep]
- `typescript` current `6.0.2` modified `2026-04-01`; repo pin `^5.9.3`. [VERIFIED: npm registry][VERIFIED: codebase grep]

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── api/routes/ingestion-check.ts          # scoped check POST route and conflict handling
├── api/routes/inspection.ts               # run inspection payload with expanded diff output
├── api/schemas.ts                         # scoped-check and diff request/response DTOs
├── services/ingestion-check.ts            # scope lookup and scope-local eligibility validation
├── services/verdict-runner.ts             # persist scope-aware run metadata
├── services/verdict-diff.ts               # baseline resolution and labeled diff items
├── storage/repositories/ingestion-session-repository.ts  # scope lookup by sessionId + scopeId
└── storage/repositories/verdict-run-repository.ts        # load and save scope-aware run rows
```

### Pattern 1: Scope-First Check Execution
**What:** Resolve a persisted `scopeId`, derive the exact covered segments, and validate approval or staleness only inside that scope before starting the verdict run. [VERIFIED: 11-CONTEXT.md][VERIFIED: codebase grep][ASSUMED]
**When to use:** Every scoped `/check` request, including full-approved-draft, section, and contiguous segment-range checks. [VERIFIED: 11-CONTEXT.md]
**Example:**
```typescript
// Pattern adapted from src/services/ingestion-check.ts and src/domain/drafts.ts.
// Source: VERIFIED codebase pattern [VERIFIED: codebase grep]
const snapshot = await ingestionSessionRepository.loadSessionSnapshot(sessionId);
const scope = snapshot.checkScopes.find((candidate) => candidate.scopeId === request.scopeId);
if (!scope) {
  throw new IngestionConflictError(`Scope ${request.scopeId} is not available for session ${sessionId}.`);
}

const scopedSegments = selectSegmentsForScope(snapshot.segments, scope);
assertSegmentsAreApprovedAndCurrent(scopedSegments);

return executeVerdictRun({
  storyId: snapshot.session.storyId!,
  revisionId: snapshot.session.revisionId!,
  scopeRef: serializeScopeRef(sessionId, scope)
});
```

### Pattern 2: Persist Scope Snapshot With Run Lineage
**What:** Save the resolved scope metadata on the run when the run is created so later diff and inspection reads do not depend on mutable live session state. [VERIFIED: codebase grep][ASSUMED]
**When to use:** Inside `executeVerdictRun()` and `VerdictRunRepository.saveRun()`. [VERIFIED: codebase grep][ASSUMED]
**Example:**
```typescript
// Recommended additive extension to the current saveRun path. [ASSUMED]
await verdictRunRepository.saveRun({
  runId,
  storyId,
  revisionId,
  previousRunId,
  triggerKind,
  createdAt,
  scopeId: scopeRef.scopeId,
  sessionId: scopeRef.sessionId,
  scopeSnapshot: scopeRef.scopeSnapshot
});
```

### Pattern 3: Explicit Baseline Resolver
**What:** Resolve diff baseline in this order: explicit base run, explicit base revision with comparable scope identity, then `previousRunId` fallback. [VERIFIED: 11-CONTEXT.md][ASSUMED]
**When to use:** Every diff request and every inspection payload that includes diff output. [VERIFIED: 11-CONTEXT.md][VERIFIED: codebase grep][ASSUMED]
**Example:**
```typescript
// Recommended service boundary for Phase 11. [ASSUMED]
const baseline = await resolveDiffBaseline({
  currentRunId,
  baseRunId,
  baseDraftRevisionId,
  requireComparableScope: true
});

return diffVerdictRuns({ currentRunId, baselineRunId: baseline.runId });
```

### Anti-Patterns to Avoid
- **Silent scope shrinkage:** Do not drop unresolved segments out of the requested scope to make a check pass; the locked decision is fail-closed conflict behavior. [VERIFIED: 11-CONTEXT.md]
- **Text-overlap scope matching:** Do not compare revisions by `sourceTextRef` overlap or raw-text similarity in Phase 11; that heuristic is explicitly deferred. [VERIFIED: 11-CONTEXT.md]
- **Soft-prior contamination:** Do not let advisory ranking change persisted hard verdict kinds, finding IDs, or diff classification semantics. [VERIFIED: 11-CONTEXT.md][VERIFIED: codebase grep]
- **Full inspection dumps inside diff items:** Do not inline full evidence or advisory payloads into diff responses; return lean trace references instead. [VERIFIED: 11-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-revision scope matching | Fuzzy `sourceTextRef` overlap, text hash, or paragraph similarity heuristics in Phase 11. [VERIFIED: 11-CONTEXT.md] | Persisted `scopeId` or stable section identity only, with explicit conflict when deterministic comparison is unavailable. [VERIFIED: 11-CONTEXT.md][ASSUMED] | The phase boundary explicitly forbids best-effort matching because it would make diff results non-auditable. [VERIFIED: 11-CONTEXT.md] |
| Verdict diff classification | Generic deep-diff over inspection JSON or rendered UI payloads. [ASSUMED] | Extend the current finding-ID-based diff service and add labeled trace fields. [VERIFIED: codebase grep][ASSUMED] | The current service already knows how to classify added, resolved, persisted, and changed findings; extending that path preserves deterministic semantics. [VERIFIED: codebase grep] |
| Scoped check validation | Route-local ad hoc filters in multiple handlers. [ASSUMED] | One service helper in `src/services/ingestion-check.ts` reused by the route and later inspection consumers. [VERIFIED: codebase grep][ASSUMED] | Thin Fastify routes and service-layer orchestration are already the dominant repo pattern. [VERIFIED: codebase grep] |
| Run orchestration | Queue-backed or background-worker execution in this phase. [VERIFIED: 11-CONTEXT.md] | Reuse the current request-driven `executeVerdictRun()` path. [VERIFIED: codebase grep] | Queue orchestration is explicitly deferred and would broaden the phase beyond scoped checks and diffing. [VERIFIED: 11-CONTEXT.md] |

**Key insight:** The risky complexity in Phase 11 is identity and traceability, not compute. The phase should spend its complexity budget on deterministic scope resolution and baseline labeling, not on heuristics or new runtime infrastructure. [VERIFIED: 11-CONTEXT.md][VERIFIED: codebase grep][ASSUMED]

## Common Pitfalls

### Pitfall 1: Accidentally Keeping the Full-Session Gate
**What goes wrong:** A section or segment-range check still returns `409` because some unrelated segment elsewhere in the session is stale or unapproved. [VERIFIED: codebase grep][ASSUMED]
**Why it happens:** `executeIngestionCheck()` currently checks `snapshot.segments.every(...)` and also requires session `workflowState === "approved"`. [VERIFIED: codebase grep]
**How to avoid:** Replace the global gate with scope-local validation and compute a scope-local approval verdict before calling `executeVerdictRun()`. [VERIFIED: 11-CONTEXT.md][ASSUMED]
**Warning signs:** Chapter-scope checks fail after reopening an unrelated segment outside the requested scope. [VERIFIED: 11-CONTEXT.md][ASSUMED]

### Pitfall 2: Assuming Current Scope IDs Are Cross-Revision Stable
**What goes wrong:** Revision-to-revision diff requests silently compare non-equivalent scopes or fail unpredictably. [VERIFIED: codebase grep][ASSUMED]
**Why it happens:** Default `documentId`, `draftRevisionId`, `sectionId`, and full-scope `scopeId` values are generated from `sessionId` when callers do not supply stable IDs. [VERIFIED: codebase grep]
**How to avoid:** Treat explicit base-run comparison as the guaranteed path and allow base-revision comparison only when both sides carry deterministic scope identity or stable section identity. [VERIFIED: 11-CONTEXT.md][ASSUMED]
**Warning signs:** New submissions produce different `draft-scope:*` or `draft-section:*` identifiers for semantically equivalent content. [VERIFIED: codebase grep]

### Pitfall 3: Letting Diff Output Bloat Into Inspection Payload Dumps
**What goes wrong:** Diff responses become huge and duplicate evidence that already lives in inspection detail payloads. [VERIFIED: 11-CONTEXT.md][ASSUMED]
**Why it happens:** It is tempting to attach the entire current and previous verdict evidence blobs to every diff item. [ASSUMED]
**How to avoid:** Return only the lean trace refs named in the locked decision set and let detailed inspection reads resolve heavier evidence on demand. [VERIFIED: 11-CONTEXT.md]
**Warning signs:** Diff schemas start carrying `eventSummaries`, `stateSummaries`, `ruleSummaries`, or advisory payloads inline. [VERIFIED: codebase grep][ASSUMED]

### Pitfall 4: Mixing Advisory Soft Priors Into Hard Diff Semantics
**What goes wrong:** A diff reports a hard change because advisory reranking changed, even though deterministic hard verdicts did not. [VERIFIED: 11-CONTEXT.md][ASSUMED]
**Why it happens:** Inspection payloads already combine deterministic verdict detail and advisory repair ranking in one response object. [VERIFIED: codebase grep]
**How to avoid:** Keep diff classification keyed only to persisted hard verdict records and expose advisory changes separately, if at all. [VERIFIED: 11-CONTEXT.md][VERIFIED: codebase grep][ASSUMED]
**Warning signs:** `softPrior.status`, reranked repairs, or adjustment scores appear in the diff classification logic. [VERIFIED: codebase grep][ASSUMED]

### Pitfall 5: Ambiguous Baseline Selection
**What goes wrong:** Callers cannot tell whether a diff used `previousRunId`, an explicit run, or a revision-derived baseline. [VERIFIED: 11-CONTEXT.md][ASSUMED]
**Why it happens:** The current service only knows about `previousRunId`, so adding explicit baselines without echoing the resolved target can create silent fallback behavior. [VERIFIED: codebase grep][ASSUMED]
**How to avoid:** Make baseline inputs mutually exclusive and echo the resolved baseline in the response envelope. [VERIFIED: 11-CONTEXT.md][ASSUMED]
**Warning signs:** API responses only show the current run and not the resolved base run or revision. [VERIFIED: codebase grep][ASSUMED]

## Code Examples

Verified patterns from current repo surfaces and official docs:

### Scoped Check Request Schema
```typescript
// Source: src/api/schemas.ts + src/domain/drafts.ts [VERIFIED: codebase grep]
// Recommended Phase 11 extension [ASSUMED]
const ScopedCheckRequestSchema = z.object({
  scopeId: DraftCheckScopeIdSchema,
  diffBase: z
    .discriminatedUnion("kind", [
      z.object({ kind: z.literal("previous_run") }),
      z.object({ kind: z.literal("run"), runId: z.string().min(1) }),
      z.object({ kind: z.literal("revision"), draftRevisionId: DraftRevisionIdSchema })
    ])
    .optional()
});
```

### Lean Diff Item Trace Shape
```typescript
// Source: 11-CONTEXT locked output requirements + existing inspection trace fields.
// VERIFIED current trace fields in src/domain/inspection.ts [VERIFIED: 11-CONTEXT.md][VERIFIED: codebase grep]
// Recommended Phase 11 shape [ASSUMED]
const DiffFindingTraceSchema = z.object({
  findingId: z.string().min(1),
  verdictKind: VerdictKindSchema,
  scopeId: DraftCheckScopeIdSchema,
  segmentIds: z.array(z.string().min(1)).default([]),
  sourceTextRef: DraftSourceTextRefSchema.nullable().default(null),
  ruleVersionIds: z.array(RuleVersionIdSchema).default([])
});
```

### Baseline-Aware Diff Service
```typescript
// Source: src/services/verdict-diff.ts current previous-run flow [VERIFIED: codebase grep]
// Recommended Phase 11 extension [ASSUMED]
const baseline = await resolveDiffBaseline({
  currentRunId,
  baseRunId: request.baseRunId,
  baseDraftRevisionId: request.baseDraftRevisionId,
  verdictRunRepository
});

const diff = await diffVerdictRuns({
  currentRunId,
  baselineRunId: baseline.runId,
  verdictRepository,
  verdictRunRepository
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual `/check` requires the entire session to be approved and current. [VERIFIED: codebase grep] | Scoped checks should validate only the requested approved scope and keep fail-closed conflicts inside that scope. [VERIFIED: 11-CONTEXT.md][ASSUMED] | Planned for Phase 11 | Unlocks safe partial progress without reopening unrelated approved segments. [VERIFIED: 11-CONTEXT.md][ASSUMED] |
| Diffing only follows `previousRunId`. [VERIFIED: codebase grep] | Diffing should still default to `previousRunId` but also accept explicit base run or base revision inputs. [VERIFIED: 11-CONTEXT.md][ASSUMED] | Planned for Phase 11 | Satisfies run-over-run and revision-over-revision comparison requirements. [VERIFIED: REQUIREMENTS.md][ASSUMED] |
| Diff payloads are finding-ID lists plus representative change flag. [VERIFIED: codebase grep] | Diff payloads should carry finding-level scope labels and lean trace refs. [VERIFIED: 11-CONTEXT.md][ASSUMED] | Planned for Phase 11 | Satisfies `TRACE-01` without duplicating full inspection evidence. [VERIFIED: REQUIREMENTS.md][VERIFIED: 11-CONTEXT.md][ASSUMED] |

**Deprecated/outdated:**
- Whole-session-only manual checks are outdated for draft-scale workflows once Phase 11 lands; keep them only as the legacy fallback path. [VERIFIED: codebase grep][VERIFIED: 11-CONTEXT.md][ASSUMED]
- Best-effort cross-revision scope matching remains deferred and should not be introduced in this phase. [VERIFIED: 11-CONTEXT.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Persisting a sanitized scope snapshot with each verdict run is the best additive way to support deterministic diff labels in Phase 11. | Architecture Patterns | If later queries need more normalized joins, a follow-up migration may be needed. |
| A2 | Some real callers may rely on auto-generated session-derived draft or section IDs, so base-revision diff requests should return explicit conflict when comparable identity is missing. | Summary, Common Pitfalls, Open Questions | Revision diff UX may need a stricter submit contract or an earlier identity backfill. |
| A3 | The inspection payload can remain the primary detailed diff surface, while scoped check responses only need run and baseline metadata plus advisory separation. | Architecture Patterns, Open Questions | If another client needs raw diff data directly, Phase 11 may need a dedicated diff route sooner. |

## Open Questions

1. **How often do real submissions reuse stable `documentId` and `draftRevisionId` across revisions?**
- What we know: default IDs are session-derived when callers do not provide them. [VERIFIED: codebase grep]
- What's unclear: whether actual clients already provide stable draft identity across revisions often enough for base-revision diff to work immediately. [ASSUMED]
- Recommendation: plan explicit conflict behavior for incomparable revision baselines and treat explicit base-run diff as the guaranteed path. [ASSUMED]

2. **Should scope metadata live as normalized columns, JSONB, or both on `verdict_runs`?**
- What we know: `verdict_runs` already stores additive run-level metadata and an `inspection_snapshot` JSONB payload. [VERIFIED: codebase grep]
- What's unclear: whether Phase 11 needs indexed lookups by `scopeId` only, or richer queries by section or range immediately. [ASSUMED]
- Recommendation: persist at least queryable `scopeId` plus a sanitized scope snapshot, then add more normalized columns only if a concrete query needs them. [ASSUMED]

3. **Does Phase 11 need a dedicated diff route, or is extending inspection payloads enough?**
- What we know: there is already a GET inspection route by `runId`, and inspection payloads already include diff output. [VERIFIED: codebase grep]
- What's unclear: whether any non-inspection consumer needs labeled diff output directly from the check flow in this milestone. [ASSUMED]
- Recommendation: keep route additions minimal unless planning uncovers a concrete external consumer beyond the existing inspection flow. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | TypeScript, Fastify, Vitest execution | ✓ | `v25.8.2` | Repo stack targets Node 24 LTS in `AGENTS.md`, but the current checkout passed `npm run typecheck` on Node 25.8.2. [VERIFIED: local command][VERIFIED: AGENTS.md] |
| npm | Package scripts and registry verification | ✓ | `11.12.1` | — |
| Local Vitest install | Quick phase regressions | ✓ | repo pin `3.2.4` | — [VERIFIED: codebase grep][VERIFIED: local command] |
| External PostgreSQL service | Not required for local phase validation | n/a | — | Use the existing `pg-mem` harness for storage and API tests. [VERIFIED: codebase grep] |

**Missing dependencies with no fallback:**
- None. [VERIFIED: local command][VERIFIED: codebase grep]

**Missing dependencies with fallback:**
- None for planning or standard local validation; `pg-mem` already covers storage-backed tests without an external database service. [VERIFIED: codebase grep]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `Vitest` repo pin `3.2.4`; targeted runs passed locally. [VERIFIED: codebase grep][VERIFIED: local command] |
| Config file | `vitest.config.ts`. [VERIFIED: codebase grep] |
| Quick run command | `npx vitest run tests/api/check-controls-api.test.ts tests/engine/verdict-diff.test.ts tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts`. [VERIFIED: local command] |
| Full suite command | `npm run typecheck && npm run test:ingestion && npm run test:reasoning`. [VERIFIED: codebase grep][ASSUMED] |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DRAFT-02 | Compare verdict changes across revisions or explicit baselines. [VERIFIED: REQUIREMENTS.md] | service + API | `npx vitest run tests/engine/verdict-diff.test.ts tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts` | ✅ existing files, but new revision-baseline cases are still needed. [VERIFIED: codebase grep][ASSUMED] |
| CHECK-01 | Run checks against explicit approved scope only. [VERIFIED: REQUIREMENTS.md] | API + service | `npx vitest run tests/api/check-controls-api.test.ts` | ✅ existing file, but new `scopeId` request cases are needed. [VERIFIED: codebase grep][ASSUMED] |
| DIFF-01 | Classify added, resolved, persisted, and changed findings with scope labels. [VERIFIED: REQUIREMENTS.md] | service + API | `npx vitest run tests/engine/verdict-diff.test.ts tests/api/inspection-api.test.ts` | ✅ existing files, but labeled diff item assertions are missing. [VERIFIED: codebase grep][ASSUMED] |
| TRACE-01 | Preserve canonical IDs, rule IDs, and source spans in diff or run output. [VERIFIED: REQUIREMENTS.md] | service + API | `npx vitest run tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts` | ✅ existing files, but scope-aware trace assertions are missing. [VERIFIED: codebase grep][ASSUMED] |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/api/check-controls-api.test.ts tests/engine/verdict-diff.test.ts tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts`. [VERIFIED: local command]
- **Per wave merge:** `npm run typecheck && npm run test:ingestion && npm run test:reasoning`. [VERIFIED: codebase grep][ASSUMED]
- **Phase gate:** Full suite green and explicit scoped-check plus revision-diff cases added before `/gsd-verify-work`. [VERIFIED: REQUIREMENTS.md][ASSUMED]

### Wave 0 Gaps
- [ ] `tests/services/ingestion-check-scoped.test.ts` — direct service coverage for `scopeId` resolution, scope-local eligibility, and fail-closed conflicts. [ASSUMED]
- [ ] `tests/storage/verdict-run-scope-metadata.test.ts` — if the existing verdict-run snapshot test is not extended, add focused storage coverage for new scope metadata persistence and reload. [ASSUMED]
- [ ] Extend `tests/api/check-controls-api.test.ts` — add body-based scoped `/check` requests, explicit diff baseline requests, and legacy full-scope compatibility assertions. [VERIFIED: codebase grep][ASSUMED]
- [ ] Extend `tests/engine/verdict-diff.test.ts` and `tests/services/inspection-payload.test.ts` — add scope labels, explicit baseline resolution, and lean trace field assertions. [VERIFIED: codebase grep][ASSUMED]

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No authentication surface exists in the current local API. [VERIFIED: codebase grep] |
| V3 Session Management | no | No session-cookie or token management surface exists in the current local API. [VERIFIED: codebase grep] |
| V4 Access Control | yes | Resolve scopes and diff baselines through repository-constrained identifiers such as `sessionId`, `storyId`, `revisionId`, and `scopeId`; reject unresolved or foreign IDs explicitly. [VERIFIED: codebase grep][ASSUMED] |
| V5 Input Validation | yes | Continue using Zod schemas for params, bodies, and response DTOs at every new Phase 11 boundary. [VERIFIED: codebase grep][CITED: https://zod.dev/] |
| V6 Cryptography | no | No new cryptography is required; existing Node crypto use is limited to deterministic fingerprinting. [VERIFIED: codebase grep] |

### Known Threat Patterns for the current stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-session or cross-run ID injection via `scopeId` or `runId` | Spoofing / Information Disclosure | Constrain lookups by the expected parent identity and return 404 or 409 without leaking unrelated scope metadata. [VERIFIED: codebase grep][ASSUMED] |
| Silent scope shrinkage that hides unsafe segments | Tampering | Keep the scoped check path fail-closed and never auto-prune unresolved segments out of the request. [VERIFIED: 11-CONTEXT.md] |
| Ambiguous baseline fallback | Repudiation | Make baseline inputs mutually exclusive and echo the resolved baseline in the response. [VERIFIED: 11-CONTEXT.md][ASSUMED] |
| Oversharing internal trace or advisory payloads in diff output | Information Disclosure | Return lean trace refs only and keep heavier evidence in the inspection read path. [VERIFIED: 11-CONTEXT.md][ASSUMED] |
| Advisory soft-prior data affecting hard diff truth | Tampering | Derive diff classification from persisted hard verdicts only and expose advisory data separately. [VERIFIED: 11-CONTEXT.md][VERIFIED: codebase grep] |

## Sources

### Primary (HIGH confidence)
- `src/services/ingestion-check.ts`, `src/services/verdict-runner.ts`, `src/services/verdict-diff.ts`, `src/services/inspection-payload.ts`, `src/api/routes/ingestion-check.ts`, `src/api/routes/inspection.ts`, `src/api/schemas.ts`, `src/storage/repositories/verdict-run-repository.ts`, `src/storage/repositories/ingestion-session-repository.ts`, `src/storage/migrations/0002_verdict_runs.sql`, `src/storage/migrations/0005_draft_scope.sql` - current implementation seams, persistence layout, and API contracts. [VERIFIED: codebase grep]
- `.planning/phases/11-scoped-checks-and-revision-diff/11-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/phases/10-incremental-extraction-and-review-resilience/10-VERIFICATION.md` - locked decisions, success criteria, requirement mapping, and verified upstream guardrails. [VERIFIED: codebase grep]
- `npm view fastify`, `npm view zod`, `npm view vitest`, `npm view pg`, `npm view pg-mem`, `npm view typescript`, `npm view tsx`, `npm view @playwright/test` - current registry versions and modification dates. [VERIFIED: npm registry]
- `https://fastify.dev/docs/latest/Reference/Routes/` - current Fastify route reference. [CITED: https://fastify.dev/docs/latest/Reference/Routes/]
- `https://zod.dev/` - current Zod documentation for schema modeling patterns. [CITED: https://zod.dev/]
- `https://vitest.dev/guide/` - current Vitest guide for targeted CLI-driven validation. [CITED: https://vitest.dev/guide/]

### Secondary (MEDIUM confidence)
- None.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - the phase reuses the current repo stack and registry versions were verified in-session. [VERIFIED: codebase grep][VERIFIED: npm registry]
- Architecture: MEDIUM - the main seams are clear, but cross-revision comparable scope identity depends on caller-provided stable IDs or explicit failure semantics. [VERIFIED: codebase grep][ASSUMED]
- Pitfalls: HIGH - the biggest risks come directly from the current full-session gate, current previous-run-only diff path, and the locked phase boundary against heuristic matching. [VERIFIED: codebase grep][VERIFIED: 11-CONTEXT.md]

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 unless the phase context or repo dependency pins change sooner. [VERIFIED: npm registry][ASSUMED]
