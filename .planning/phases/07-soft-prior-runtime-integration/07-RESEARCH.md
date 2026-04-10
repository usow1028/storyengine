# Phase 7: Soft-Prior Runtime Integration - Research

**Researched:** 2026-04-10  
**Domain:** TypeScript service/API integration for advisory soft-prior runtime output  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

Source for this section: `.planning/phases/07-soft-prior-runtime-integration/07-CONTEXT.md` [VERIFIED: repo file]

### Locked Decisions

#### Runtime Integration Location
- **D-01:** Wire soft-prior evaluation as an optional advisory result on `executeVerdictRun`, then let `executeIngestionCheck` propagate that result through the manual check/API path.
- **D-02:** Keep hard verdict generation authoritative inside the existing verdict-run flow; soft-prior evaluation may annotate the returned runtime result but must not change saved hard verdict kinds, finding IDs, evidence snapshots, or run metadata semantics.

#### Prior Snapshot Input
- **D-03:** Resolve prior snapshots through explicit runtime dependency/config such as `priorSnapshotDir` or `softPriorConfig`, not by assuming a committed `data/prior-snapshots/` tree always exists.
- **D-04:** Allow `snapshotSet` injection in tests and internal fixtures so API and service regressions can exercise deterministic prior artifacts without relying on global filesystem state.
- **D-05:** If prior snapshots are missing or disabled, return an explicit advisory unavailable state rather than failing the hard check or silently pretending no drift exists.

#### API Response Contract
- **D-06:** Extend manual check responses with a separate `softPrior` advisory block instead of mixing soft-prior fields into hard verdict/run metadata.
- **D-07:** The `softPrior` block should expose status, assessment details, and repair plausibility adjustments. The minimum inspectable assessment includes drift scores, thresholds, triggered drifts, dominant prior layer, representative pattern summary, and contribution evidence.
- **D-08:** Preserve the existing top-level check fields (`sessionId`, `workflowState`, `storyId`, `revisionId`, `runId`, `previousRunId`) so Phase 5 API consumers remain compatible.

#### Verification Criteria
- **D-09:** Use an API end-to-end regression through `submit -> extract -> review -> approve -> check` as the primary proof that soft-prior results surface in the live runtime flow.
- **D-10:** The primary E2E must prove that `softPrior.status === "available"` when configured snapshots are present, that advisory assessment and repair plausibility data are returned, and that hard verdict classification/run metadata remain unchanged by the soft-prior layer.
- **D-11:** Add focused service-level tests for `executeVerdictRun` and/or `executeIngestionCheck` as supporting coverage, but do not treat static `rg` wiring checks as sufficient completion proof for this runtime integration phase.

### Claude's Discretion
- Exact TypeScript names for the config/dependency objects and result DTOs, as long as the hard/soft contract remains explicit.
- Exact unavailable status shape, as long as clients can distinguish disabled/missing prior snapshots from an available assessment with no triggered drifts.
- Exact transition-building helper used to convert live canonical events into `SoftPriorTransitionInput`, as long as it is deterministic, schema-backed, and test-covered.

### Deferred Ideas (OUT OF SCOPE)
- Project-specific and user-specific priors remain deferred beyond this phase.
- Raw prior pattern browsing and UI-heavy inspection remain deferred to Phase 8 or later.
- Automatic scheduled prior rebuilding remains deferred until manual snapshot workflows stabilize.
- Persisting soft-prior assessment history is not required unless Phase 7 planning finds it necessary for traceability without changing the existing hard verdict storage contract.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SOFT-01 | Engine can use corpus-derived narrative patterns as soft priors without promoting them to hard rules. [VERIFIED: `.planning/REQUIREMENTS.md`] | The existing evaluator already scores priors and reranks repairs; Phase 7 must wire it into `executeVerdictRun`, propagate a separate `softPrior` API block, and test that persisted hard verdict data remains unchanged. [VERIFIED: `src/services/soft-prior-evaluator.ts`, `src/services/verdict-runner.ts`, `src/api/schemas.ts`, `.planning/phases/04-corpus-priors-and-soft-pattern-layer/04-VERIFICATION.md`] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- Every judgment must be traceable to explicit states, events, rules, or missing assumptions; black-box scoring is insufficient. [VERIFIED: `AGENTS.md`]
- Default physics remains the baseline world model unless user-defined world rules extend or override it. [VERIFIED: `AGENTS.md`]
- Frontier LLMs may assist extraction, but deterministic consistency judgment must stay logic-led. [VERIFIED: `AGENTS.md`]
- The first milestone prioritizes rule systems, schemas, taxonomies, and a working consistency core before ambitious UI or visualization. [VERIFIED: `AGENTS.md`]
- The project stack is TypeScript-first with Zod, Fastify, Vitest, PostgreSQL-style repositories, and offline prior snapshots. [VERIFIED: `AGENTS.md`, `package.json`]
- Repo-local `.claude/skills/` and `.agents/skills/` directories are absent, so no additional project skill rules apply. [VERIFIED: `find .claude/skills .agents/skills -name SKILL.md`]
- `CLAUDE.md` is absent in the project root, so no extra CLAUDE-specific directives were found. [VERIFIED: `test -f CLAUDE.md`]

## Summary

Phase 7 is an integration phase, not a new prior-math phase. The repo already has prior artifact schemas, snapshot loading, soft drift scoring, repair plausibility reranking, and isolated tests; the missing product behavior is live wiring from `executeVerdictRun` through `executeIngestionCheck` and the Fastify check response. [VERIFIED: `src/domain/priors.ts`, `src/engine/prior-snapshot-loader.ts`, `src/engine/soft-prior-scoring.ts`, `src/engine/repair-plausibility.ts`, `src/services/soft-prior-evaluator.ts`, `.planning/phases/04-corpus-priors-and-soft-pattern-layer/04-VERIFICATION.md`]

The planner should add a status-wrapped advisory result around the existing evaluator, not persist soft-prior data into verdict tables by default. The hard verdict runner must still save the same `verdict_runs` and `verdicts` records, while the returned runtime/API object gains a separate `softPrior` block with `available`, `disabled`, `missing_snapshot`, or `insufficient_context` style states. [VERIFIED: `.planning/phases/07-soft-prior-runtime-integration/07-CONTEXT.md`, `src/storage/migrations/0002_verdict_runs.sql`, `src/storage/repositories/verdict-repository.ts`, `src/api/schemas.ts`]

The highest-risk planning detail is runtime transition construction. Runtime tokens must mirror corpus normalization tokens (`field:operation:value`, next-event precondition tokens, current/next rule-exception tokens), otherwise the loaded snapshots will be valid but the score will be meaningless because no patterns will match. [VERIFIED: `src/corpus/normalization.ts`, `tests/corpus/corpus-normalization.test.ts`, `src/engine/soft-prior-scoring.ts`]

**Primary recommendation:** Reuse `evaluateSoftPriors`, add a deterministic runtime transition builder that shares corpus tokenization logic, wrap failures as advisory unavailability, extend `CheckIngestionResponseSchema`, and prove `submit -> extract -> review -> approve -> check` returns `softPrior.status === "available"` without changing persisted hard verdict classifications. [VERIFIED: repo code inspection]

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9.3 installed; latest registry version is 6.0.2 as of `npm view` on 2026-04-10. [VERIFIED: `npm ls`, npm registry] | Compile-time contracts for `executeVerdictRun`, advisory DTOs, and transition helpers. [VERIFIED: `tsconfig.json`, `src/services/verdict-runner.ts`] | The repo is already strict TypeScript with `moduleResolution: "NodeNext"` and `strict: true`; Phase 7 should not introduce an upgrade. [VERIFIED: `tsconfig.json`] |
| Zod | 4.3.6 installed; latest registry version is 4.3.6 as of `npm view` on 2026-04-10. [VERIFIED: `npm ls`, npm registry] | Runtime validation for domain prior schemas and API response contracts. [VERIFIED: `src/domain/priors.ts`, `src/api/schemas.ts`] | Existing API routes parse outgoing payloads through Zod before `reply.send`, so adding `softPrior` must update schemas. [VERIFIED: `src/api/routes/ingestion-check.ts`, `src/api/schemas.ts`] |
| Fastify | 5.8.4 installed; latest registry version is 5.8.4 as of `npm view` on 2026-04-10. [VERIFIED: `npm ls`, npm registry] | Existing HTTP route composition and `app.inject()` API E2E tests. [VERIFIED: `src/api/app.ts`, `tests/api/check-controls-api.test.ts`] | Phase 7 can extend the existing route and dependency object without adding a new server layer. [VERIFIED: `src/api/app.ts`] |
| Vitest | 3.2.4 installed; latest registry version is 4.1.4 as of `npm view` on 2026-04-10. [VERIFIED: `npm ls`, npm registry] | Service and API regressions for the check flow. [VERIFIED: `package.json`, `vitest.config.ts`] | Existing scripts already split `test:priors` and `test:ingestion`, which are exactly the two surfaces Phase 7 joins. [VERIFIED: `package.json`] |
| pg-mem | 3.0.14 installed; latest registry version is 3.0.14 as of `npm view` on 2026-04-10. [VERIFIED: `npm ls`, npm registry] | In-memory PostgreSQL-compatible test database for API/service flows. [VERIFIED: `tests/api/check-controls-api.test.ts`] | Existing API tests use repository instances backed by pg-mem, so Phase 7 E2E can inspect persisted verdict records without a real PostgreSQL service. [VERIFIED: `tests/api/check-controls-api.test.ts`] |
| pg | 8.20.0 installed; latest registry version is 8.20.0 as of `npm view` on 2026-04-10. [VERIFIED: `npm ls`, npm registry] | Repository client interface in production-style storage. [VERIFIED: `src/storage/repositories/*.ts`] | No new database adapter is needed because the phase is returned advisory data unless persistence is explicitly added later. [VERIFIED: `.planning/phases/07-soft-prior-runtime-integration/07-CONTEXT.md`] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tsx | 4.21.0 installed; latest registry version is 4.21.0 as of `npm view` on 2026-04-10. [VERIFIED: `npm ls`, npm registry] | Existing prior build script runner. [VERIFIED: `package.json`, `scripts/build-priors.ts`] | Use only for prior fixture generation/build scripts; Phase 7 runtime should load snapshots or injected `snapshotSet`, not run builds. [VERIFIED: `.planning/phases/07-soft-prior-runtime-integration/07-CONTEXT.md`] |
| Node.js | Current machine: v25.8.2; project guidance names Node 24.14.0 LTS. [VERIFIED: `node --version`, `AGENTS.md`] | Runtime for tests and scripts. [VERIFIED: `package.json`] | Do not introduce Node 25-only APIs; the project guidance still targets the Node 24 LTS line. [VERIFIED: `AGENTS.md`, `tsconfig.json`] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `executeVerdictRun` advisory hook | `executeIngestionCheck`-only hook | Rejected by locked decision D-01 because future checked flows would miss the advisory result. [VERIFIED: `07-CONTEXT.md`] |
| Separate `softPrior` block | Top-level fields or mutating verdict records | Rejected by locked decisions D-06 through D-08 because hard run metadata must remain compatible. [VERIFIED: `07-CONTEXT.md`] |
| Explicit `softPriorConfig` / `snapshotSet` | Fixed `data/prior-snapshots/` path | Rejected by locked decisions D-03 through D-05 because no prior snapshot artifacts are committed under `data/` in this checkout. [VERIFIED: `07-CONTEXT.md`, `find data -name '*prior*.json'`] |
| Existing Vitest API E2E | Static `rg` wiring proof | Rejected by locked decision D-11 because runtime integration must be proven through execution. [VERIFIED: `07-CONTEXT.md`] |

**Installation:**
```bash
# No new packages are required for Phase 7.
npm install
```

**Version verification:** `npm ls --depth=0 --json` confirmed installed versions; `npm view <package> version time.modified --json` confirmed current registry versions on 2026-04-10. [VERIFIED: npm registry, `npm ls`]

## Architecture Patterns

### Recommended Project Structure

```text
src/
├── corpus/normalization.ts              # Share or extract token helpers for runtime transition parity. [VERIFIED: repo file]
├── domain/priors.ts                     # Add advisory status/result schemas if domain-level reuse is preferred. [VERIFIED: repo file]
├── services/soft-prior-evaluator.ts     # Keep existing load/score/rerank orchestration. [VERIFIED: repo file]
├── services/soft-prior-runtime.ts       # Recommended new wrapper for config, unavailability, transition choice, and repair sources. [VERIFIED: service-layer pattern in `src/services`]
├── services/verdict-runner.ts           # Add optional advisory hook after hard verdict save. [VERIFIED: repo file]
├── services/ingestion-check.ts          # Propagate `softPrior` to manual check result. [VERIFIED: repo file]
└── api/schemas.ts                       # Add `softPrior` response schema before route parse/send. [VERIFIED: repo file]
tests/
├── engine/verdict-runner.test.ts         # Add service-level hard verdict unchanged coverage. [VERIFIED: repo file]
├── services/ingestion-check-soft-prior.test.ts # Recommended support coverage. [VERIFIED: validation gap from missing file and D-11]
└── api/check-controls-api.test.ts        # Extend or add E2E for submit/extract/review/approve/check. [VERIFIED: repo file]
```

### Pattern 1: Advisory Wrapper Around Existing Evaluator

**What:** Add a service-level wrapper that decides whether priors are enabled, builds transition input, generates repair candidates from hard verdict findings, calls `evaluateSoftPriors`, and converts errors into advisory status values. [VERIFIED: `src/services/soft-prior-evaluator.ts`, `src/engine/repair-generator.ts`, `07-CONTEXT.md`]

**When to use:** Use after hard verdicts are generated and saved in `executeVerdictRun`, because soft output must annotate the runtime result without altering persisted hard verdict data. [VERIFIED: `src/services/verdict-runner.ts`, `src/storage/repositories/verdict-repository.ts`, `07-CONTEXT.md`]

**Example:**
```typescript
// Source: recommended wrapper based on existing service and engine contracts. [VERIFIED: repo code]
const repairs = generateRepairCandidates({
  sources: verdicts.flatMap((verdict) =>
    verdict.evidence.findingId && verdict.evidence.reasonCode
      ? [{
          sourceFindingId: verdict.evidence.findingId,
          reasonCode: verdict.evidence.reasonCode,
          category: verdict.category,
          verdictKind: verdict.verdictKind,
          evidence: verdict.evidence
        }]
      : []
  )
});

const softPrior = await evaluateConfiguredSoftPrior({
  config: input.softPriorConfig,
  graph,
  verdicts,
  repairs
});
```

### Pattern 2: Schema-First API Propagation

**What:** Extend `CheckIngestionResponseSchema` with a separate `softPrior` object before returning route data through `CheckIngestionResponseSchema.parse(result)`. [VERIFIED: `src/api/routes/ingestion-check.ts`, `src/api/schemas.ts`]

**When to use:** Use whenever a service result gains an API field, because the existing route parses the returned object before sending it. [VERIFIED: `src/api/routes/ingestion-check.ts`]

**Example:**
```typescript
// Source: existing route parse/send pattern. [VERIFIED: src/api/routes/ingestion-check.ts]
const result = await executeIngestionCheck(sessionId, dependencies);
return reply.code(200).send(CheckIngestionResponseSchema.parse(result));
```

### Pattern 3: Runtime Transition Builder Mirrors Corpus Normalization

**What:** Build `SoftPriorTransitionInput` from adjacent sorted canonical events using the same token shape as corpus normalization: state transition tokens are `field:operation:value`, state axes come from next-event state changes, precondition tokens come from next-event preconditions, and world-rule exception tokens come from current plus next event rule changes. [VERIFIED: `src/corpus/normalization.ts`, `src/domain/events.ts`, `src/engine/types.ts`]

**When to use:** Use before scoring because `scoreSoftDrift` matches `currentEventType`, `nextEventType`, and token overlaps against prior snapshots. [VERIFIED: `src/engine/soft-prior-scoring.ts`]

**Example:**
```typescript
// Source: corpus normalization token shape. [VERIFIED: src/corpus/normalization.ts]
function stateChangeToken(change: { field: string; operation: string; value: unknown }) {
  return `${change.field}:${change.operation}:${String(change.value ?? "unknown")}`;
}
```

### Pattern 4: Explicit Advisory Unavailability

**What:** Return a structured unavailable result for disabled config, missing `baseline.prior.json`, missing enough events, or absent transition context. [VERIFIED: `07-CONTEXT.md`, `src/engine/prior-snapshot-loader.ts`]

**When to use:** Use in `executeVerdictRun` and `executeIngestionCheck` so hard checks still complete even when prior artifacts are absent. [VERIFIED: `07-CONTEXT.md`]

**Recommended status values:** `disabled`, `missing_snapshot`, `insufficient_context`, `available`. [VERIFIED: derived from D-05 discretion in `07-CONTEXT.md`]

### Anti-Patterns to Avoid

- **Fixed snapshot path:** Do not assume `data/prior-snapshots/` exists; this checkout has no prior JSON files under `data/`. [VERIFIED: `find data -name '*prior*.json'`]
- **Soft verdict mutation:** Do not write soft-prior data into `VerdictRecord.verdictKind`, `findingId`, `evidence`, or `VerdictRunRecord`; locked decisions forbid changing hard semantics. [VERIFIED: `07-CONTEXT.md`, `src/domain/verdicts.ts`]
- **Route-only integration:** Do not call `evaluateSoftPriors` only from `src/api/routes/ingestion-check.ts`; D-01 selects `executeVerdictRun` as the integration point. [VERIFIED: `07-CONTEXT.md`]
- **Duplicate token logic:** Do not create runtime tokens that diverge from `src/corpus/normalization.ts`; scoring depends on token overlap. [VERIFIED: `src/corpus/normalization.ts`, `src/engine/soft-prior-scoring.ts`]
- **Schema-after-service ordering:** Do not return `softPrior` from the service without updating `CheckIngestionResponseSchema`; Zod object parsing currently strips unknown keys from parsed output. [VERIFIED: local Zod check, `src/api/schemas.ts`]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Prior loading and JSON parsing | Custom `fs.readFile` plus unchecked JSON in Phase 7 | `loadPriorSnapshotSet` and `PriorSnapshotArtifactSchema` [VERIFIED: `src/engine/prior-snapshot-loader.ts`, `src/domain/priors.ts`] | Existing loader validates artifacts through Zod and tolerates missing genre artifacts while requiring baseline snapshots. [VERIFIED: `src/engine/prior-snapshot-loader.ts`] |
| Soft drift scoring | New scoring formulas inside the verdict runner | `scoreSoftDrift` through `evaluateSoftPriors` [VERIFIED: `src/engine/soft-prior-scoring.ts`, `src/services/soft-prior-evaluator.ts`] | Phase 4 already verifies drift scores, thresholds, contributions, dominant layer, and representative summary. [VERIFIED: `tests/engine/soft-prior-scoring.test.ts`] |
| Repair reranking | Manual sort based on repair type in API code | `rerankRepairsWithPriors` through `evaluateSoftPriors` [VERIFIED: `src/engine/repair-plausibility.ts`] | Existing code returns both reranked repairs and `RepairPlausibilityAdjustment` records. [VERIFIED: `src/engine/repair-plausibility.ts`] |
| Repair candidate derivation | Ad hoc API-only repair objects | `generateRepairCandidates` from verdict evidence sources [VERIFIED: `src/engine/repair-generator.ts`] | Existing repair generation already maps hard verdict reason codes to candidate repair types. [VERIFIED: `tests/engine/repair-generator.test.ts`] |
| API validation | Manual JSON shape checks in routes | Zod response schemas in `src/api/schemas.ts` [VERIFIED: repo file] | Existing route pattern validates outgoing check responses before sending. [VERIFIED: `src/api/routes/ingestion-check.ts`] |
| Runtime E2E proof | Static `rg` checks only | Vitest `app.inject()` tests through the full ingestion check route [VERIFIED: `tests/api/check-controls-api.test.ts`, `07-CONTEXT.md`] | Static wiring checks already failed Phase 4 verification and are explicitly insufficient for Phase 7. [VERIFIED: `04-VERIFICATION.md`, `07-CONTEXT.md`] |

**Key insight:** Phase 7 should connect existing layers and preserve boundaries; building new scoring, new persistence, or new routing abstractions creates more risk than reuse. [VERIFIED: `07-CONTEXT.md`, repo code inspection]

## Common Pitfalls

### Pitfall 1: Valid Service Result, Missing API Field
**What goes wrong:** `executeIngestionCheck` returns `softPrior`, but the API response omits it. [VERIFIED: Zod local check, `src/api/routes/ingestion-check.ts`]  
**Why it happens:** `CheckIngestionResponseSchema.parse(result)` currently has no `softPrior` key, and Zod object parsing strips unknown keys by default in this installed version. [VERIFIED: local Zod check, `src/api/schemas.ts`]  
**How to avoid:** Add `SoftPriorAdvisorySchema` and include it in `CheckIngestionResponseSchema` before changing route/service return values. [VERIFIED: existing API schema pattern]  
**Warning signs:** A service-level test passes but `app.inject()` JSON lacks `softPrior`. [VERIFIED: existing test architecture]

### Pitfall 2: Snapshot Missing Breaks Hard Check
**What goes wrong:** A missing `baseline.prior.json` throws from `loadPriorSnapshotSet` and makes `/check` fail. [VERIFIED: `src/engine/prior-snapshot-loader.ts`]  
**Why it happens:** The loader catches missing genre artifacts but does not catch a missing baseline artifact. [VERIFIED: `src/engine/prior-snapshot-loader.ts`]  
**How to avoid:** Catch loader `ENOENT` in the advisory wrapper and return `status: "missing_snapshot"` while preserving hard run success. [VERIFIED: `07-CONTEXT.md`]  
**Warning signs:** A check route returns 500 when prior config points at an empty directory. [VERIFIED: inferred from loader behavior]

### Pitfall 3: Runtime Token Drift
**What goes wrong:** `softPrior.status` is `available`, but drift scores are zero or contributions are irrelevant. [VERIFIED: `src/engine/soft-prior-scoring.ts`]  
**Why it happens:** Corpus normalization stores state tokens as `axis:operation:value`; runtime code that uses prose summaries or different separators will not overlap. [VERIFIED: `src/corpus/normalization.ts`, `tests/corpus/corpus-normalization.test.ts`]  
**How to avoid:** Extract shared token helpers or duplicate them in one tested runtime helper with direct tests against `tests/fixtures/soft-prior-fixtures.ts`. [VERIFIED: fixture availability]  
**Warning signs:** `representativePatternSummary` says no prior pattern matched for event pairs that fixtures were designed to match. [VERIFIED: `src/engine/soft-prior-scoring.ts`]

### Pitfall 4: No Repairs Means No Plausibility Adjustments
**What goes wrong:** The assessment exists, but `adjustments` is empty. [VERIFIED: `src/services/soft-prior-evaluator.ts`]  
**Why it happens:** `evaluateSoftPriors` reranks the `repairs` array it receives; `executeVerdictRun` currently does not generate repair candidates. [VERIFIED: `src/services/verdict-runner.ts`, `src/engine/repair-generator.ts`]  
**How to avoid:** Generate repair candidates from saved verdict evidence before calling the evaluator, and include `adjustments` even when no repairs exist. [VERIFIED: `src/engine/repair-generator.ts`]  
**Warning signs:** API E2E proves `assessment` but cannot assert repair plausibility adjustment data. [VERIFIED: `07-CONTEXT.md`]

### Pitfall 5: Config Cannot Identify Genre or World Profile
**What goes wrong:** The loader finds files, but scoring filters out all snapshots for the transition world profile. [VERIFIED: `src/engine/soft-prior-scoring.ts`]  
**Why it happens:** `relevantSnapshots` filters snapshots by `transition.worldProfile`, and canonical stories currently expose `defaultRulePackName` rather than a dedicated prior `worldProfile` field. [VERIFIED: `src/engine/soft-prior-scoring.ts`, `src/storage/repositories/story-repository.ts`]  
**How to avoid:** Put `genreWeights` and `worldProfile` in `softPriorConfig`, with safe defaults only when explicitly documented. [VERIFIED: `07-CONTEXT.md`, `src/engine/types.ts`]  
**Warning signs:** `snapshotSet.baselineSnapshots` has data, but `assessment.contributions` is empty. [VERIFIED: `src/engine/soft-prior-scoring.ts`]

### Pitfall 6: Hard Verdict Data Accidentally Changes
**What goes wrong:** Persisted verdict kind, finding IDs, or run metadata differ when soft priors are enabled. [VERIFIED: `07-CONTEXT.md`]  
**Why it happens:** Soft integration is placed before hard verdict persistence or writes advisory fields into hard evidence. [VERIFIED: `src/services/verdict-runner.ts`, `src/domain/verdicts.ts`]  
**How to avoid:** Run hard evaluation and save verdicts exactly as today, then compute advisory output from the saved in-memory `verdicts` array. [VERIFIED: `src/services/verdict-runner.ts`]  
**Warning signs:** Existing `tests/engine/verdict-runner.test.ts` or `tests/api/check-controls-api.test.ts` fails after adding priors. [VERIFIED: current tests]

## Code Examples

Verified patterns from repository sources:

### Existing Evaluator Contract
```typescript
// Source: src/services/soft-prior-evaluator.ts [VERIFIED: repo file]
const result = await evaluateSoftPriors({
  snapshotDir,
  transition,
  repairs,
  hardVerdictKind: "Repairable Gap",
  snapshotSet
});
```

### Existing Check Route Contract
```typescript
// Source: src/api/routes/ingestion-check.ts [VERIFIED: repo file]
const result = await executeIngestionCheck(sessionId, dependencies);
return reply.code(200).send(CheckIngestionResponseSchema.parse(result));
```

### Existing API E2E Pattern
```typescript
// Source: tests/api/check-controls-api.test.ts [VERIFIED: repo file]
const checkResponse = await app.inject({
  method: "POST",
  url: `/api/ingestion/submissions/${submitted.sessionId}/check`
});
expect(checkResponse.statusCode).toBe(200);
```

### Runtime Transition Token Parity
```typescript
// Source: src/corpus/normalization.ts [VERIFIED: repo file]
const token = `${transition.axis}:${transition.operation}:${transition.toValue ?? transition.value ?? transition.fromValue ?? "unknown"}`;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Phase 4 isolated soft-prior service and engine tests only. [VERIFIED: `04-VERIFICATION.md`] | Phase 7 should integrate advisory evaluation into `executeVerdictRun` and return a separate API block. [VERIFIED: `07-CONTEXT.md`] | Phase 7 planning on 2026-04-10. [VERIFIED: `07-CONTEXT.md`] | Closes `SOFT-01` by proving soft priors are live runtime output, not only engine internals. [VERIFIED: `.planning/REQUIREMENTS.md`, `.planning/v1.0-v1.0-MILESTONE-AUDIT.md`] |
| Static wiring checks as evidence. [VERIFIED: `04-VERIFICATION.md`] | Executed API E2E is primary proof. [VERIFIED: `07-CONTEXT.md`] | Phase 7 context gathered 2026-04-10. [VERIFIED: `07-CONTEXT.md`] | Prevents a false pass where services compile but Fastify response contracts omit advisory output. [VERIFIED: `src/api/routes/ingestion-check.ts`, `src/api/schemas.ts`] |
| Potential fixed prior snapshot directory. [VERIFIED: `scripts/build-priors.ts`] | Explicit runtime config or injected `snapshotSet`. [VERIFIED: `07-CONTEXT.md`] | Locked for Phase 7. [VERIFIED: `07-CONTEXT.md`] | Keeps tests deterministic and avoids failing checks when no prior files are committed. [VERIFIED: `find data -name '*prior*.json'`] |

**Deprecated/outdated:**
- Treating Phase 4 as satisfying `SOFT-01` end to end is outdated because verification found no live call to `evaluateSoftPriors` from verdict/manual-check/API paths. [VERIFIED: `04-VERIFICATION.md`, `rg evaluateSoftPriors`]
- Relying on `data/prior-snapshots/` as a runtime default is unsuitable for this checkout because no prior artifacts are committed under `data/`. [VERIFIED: `find data -name '*prior*.json'`]
- Upgrading TypeScript or Vitest during this phase is out of scope because current tests pass and Phase 7 is an integration gap, not a toolchain gap. [VERIFIED: `npm run typecheck`, `npm run test:priors`, `npm run test:ingestion`, `07-CONTEXT.md`]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| - | No `[ASSUMED]` claims were used. | All sections | Planner can proceed from verified repo artifacts and locked context. |

## Open Questions

1. **Should the first API contract expose one aggregate assessment or a per-transition list?**  
   - What we know: Existing `evaluateSoftPriors` scores one `SoftPriorTransitionInput`, and D-07 names a minimum singular assessment payload. [VERIFIED: `src/services/soft-prior-evaluator.ts`, `07-CONTEXT.md`]  
   - What's unclear: The final aggregation shape for multi-event revisions is not implemented yet. [VERIFIED: `src/services/verdict-runner.ts`]  
   - Recommendation: Plan one top-level assessment selected from the strongest scored transition for Phase 7, with enough transition evidence to explain the chosen representative pattern; defer per-transition browsing to Phase 8 inspection UI. [VERIFIED: derived from D-07 and deferred UI scope in `07-CONTEXT.md`]

2. **Should soft-prior assessments be persisted?**  
   - What we know: D-02 and deferred scope say not to change hard verdict storage unless planning finds a traceability need. [VERIFIED: `07-CONTEXT.md`]  
   - What's unclear: Future inspection surfaces may want historical soft-prior assessment records. [VERIFIED: Phase 8 roadmap scope in `.planning/ROADMAP.md`]  
   - Recommendation: Do not persist assessments in Phase 7; return advisory runtime/API data and leave persistence to a later explicit phase if the inspection UI needs it. [VERIFIED: derived from `07-CONTEXT.md`]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | TypeScript/Vitest runtime | ✓ | v25.8.2 on this machine [VERIFIED: `node --version`] | Keep code compatible with project Node 24 guidance. [VERIFIED: `AGENTS.md`] |
| npm | Scripts and dependency metadata | ✓ | 11.12.1 [VERIFIED: `npm --version`] | None needed. |
| TypeScript compiler | `npm run typecheck` | ✓ | 5.9.3 [VERIFIED: `npx tsc --version`] | None needed. |
| Vitest | Automated regression suites | ✓ | 3.2.4 [VERIFIED: `npx vitest --version`] | None needed. |
| Prior snapshot files in `data/` | File-based runtime config | ✗ | None found [VERIFIED: `find data -name '*prior*.json'`] | Use explicit fixture `snapshotSet` in tests and explicit `softPriorConfig` in runtime. [VERIFIED: `07-CONTEXT.md`] |
| PostgreSQL service | Production-like persistence | Not required for Phase 7 tests | pg-mem 3.0.14 installed [VERIFIED: `npm ls`, tests] | Existing pg-mem API tests. [VERIFIED: `tests/api/check-controls-api.test.ts`] |

**Missing dependencies with no fallback:** None. [VERIFIED: environment audit]

**Missing dependencies with fallback:**
- Prior snapshot files are absent in `data/`, but Phase 7 locked decisions require explicit runtime config and allow injected `snapshotSet` fixtures. [VERIFIED: `07-CONTEXT.md`, `find data -name '*prior*.json'`]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 [VERIFIED: `npx vitest --version`] |
| Config file | `vitest.config.ts` [VERIFIED: repo file] |
| Quick run command | `npx vitest run tests/engine/verdict-runner.test.ts tests/api/check-controls-api.test.ts` [VERIFIED: existing test files] |
| Full suite command | `npm run typecheck && npm run test:priors && npm run test:ingestion` [VERIFIED: commands passed on 2026-04-10] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SOFT-01 | `executeVerdictRun` can compute soft-prior advisory output without changing saved hard verdicts. [VERIFIED: `07-CONTEXT.md`] | service/unit | `npx vitest run tests/engine/verdict-runner.test.ts` | ✅ extend existing |
| SOFT-01 | `executeIngestionCheck` propagates advisory status and does not fail hard checks when priors are disabled or missing. [VERIFIED: `07-CONTEXT.md`] | service/integration | `npx vitest run tests/services/ingestion-check-soft-prior.test.ts` | ❌ Wave 0 |
| SOFT-01 | Fastify API E2E returns `softPrior.status === "available"` through `submit -> extract -> review -> approve -> check`. [VERIFIED: `07-CONTEXT.md`] | API E2E | `npx vitest run tests/api/check-controls-api.test.ts` | ✅ extend existing or add focused case |
| SOFT-01 | Advisory assessment includes drift scores, thresholds, triggered drifts, dominant layer, representative summary, contributions, and repair plausibility adjustments. [VERIFIED: `07-CONTEXT.md`, `src/domain/priors.ts`] | API/service assertion | `npx vitest run tests/api/check-controls-api.test.ts tests/services/ingestion-check-soft-prior.test.ts` | ❌ partial |
| SOFT-01 | Hard verdict classification and run metadata remain unchanged by soft-prior enablement. [VERIFIED: `07-CONTEXT.md`] | regression | `npx vitest run tests/engine/verdict-runner.test.ts tests/api/check-controls-api.test.ts` | ✅ extend existing |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/engine/verdict-runner.test.ts tests/api/check-controls-api.test.ts` [VERIFIED: existing files]
- **Per wave merge:** `npm run typecheck && npm run test:priors && npm run test:ingestion` [VERIFIED: commands passed on 2026-04-10]
- **Phase gate:** Full suite green before `/gsd-verify-work`. [VERIFIED: project GSD workflow in `AGENTS.md`]

### Wave 0 Gaps

- [ ] `tests/services/ingestion-check-soft-prior.test.ts` - covers unavailable/missing snapshot propagation for SOFT-01. [VERIFIED: validation gap from missing file and D-11]
- [ ] `tests/api/check-controls-api.test.ts` - add a full-flow case with two approved event candidates, configured `snapshotSet`, available `softPrior`, and persisted hard verdict invariance assertions. [VERIFIED: validation gap from D-09 and D-10]
- [ ] `src/services/soft-prior-runtime.ts` or equivalent helper tests - covers runtime token construction parity with corpus normalization. [VERIFIED: validation gap from `src/corpus/normalization.ts` and current runtime absence]
- [ ] `src/api/schemas.ts` - add schema coverage indirectly through API E2E because routes parse responses through `CheckIngestionResponseSchema`. [VERIFIED: `src/api/routes/ingestion-check.ts`]

## Security Domain

OWASP ASVS latest stable version is 5.0.0 dated May 2025, and OWASP recommends version-qualified requirement references because identifiers can change. [CITED: https://github.com/OWASP/ASVS]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase 7 does not add authentication or identity flows. [VERIFIED: `src/api/app.ts`, `07-CONTEXT.md`] |
| V3 Session Management | no | Ingestion `sessionId` is workflow state, not an authenticated user session. [VERIFIED: `src/domain/ingestion.ts`, `src/storage/migrations/0003_ingestion_review.sql`] |
| V4 Access Control | limited | Do not accept request-supplied snapshot paths; use server-side `softPriorConfig` only. [VERIFIED: `07-CONTEXT.md`, `src/api/routes/ingestion-check.ts`] |
| V5 Input Validation | yes | Keep Zod validation for API response, prior artifacts, and domain schemas. [VERIFIED: `src/api/schemas.ts`, `src/domain/priors.ts`, `src/engine/prior-snapshot-loader.ts`] |
| V6 Cryptography | no | Phase 7 does not add cryptographic operations. [VERIFIED: repo grep] |

### Known Threat Patterns for Phase 7 Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| User-controlled snapshot path traversal | Tampering / Information Disclosure | Keep `snapshotDir` in trusted server config or injected test dependencies, never in API request payload. [VERIFIED: `07-CONTEXT.md`, `src/api/schemas.ts`] |
| Malformed prior artifact changes runtime behavior | Tampering | Parse artifacts through `PriorSnapshotArtifactSchema` and convert parse/load failures into advisory unavailable states. [VERIFIED: `src/engine/prior-snapshot-loader.ts`, `07-CONTEXT.md`] |
| Advisory output mistaken for hard truth | Spoofing / Tampering | Use a separate `softPrior` block and never mutate `VerdictRecord` or `VerdictRunRecord` semantics. [VERIFIED: `07-CONTEXT.md`, `src/domain/verdicts.ts`] |
| Excessive prior evidence disclosure | Information Disclosure | API response should expose assessment/contribution evidence needed by D-07, not raw snapshot source work IDs or full prior artifacts. [VERIFIED: `src/domain/priors.ts`, `07-CONTEXT.md`] |
| Snapshot load failure denies hard checks | Denial of Service | Catch missing/disabled prior cases and still return the hard check result. [VERIFIED: `07-CONTEXT.md`, `src/engine/prior-snapshot-loader.ts`] |

## Sources

### Primary (HIGH confidence)
- `.planning/phases/07-soft-prior-runtime-integration/07-CONTEXT.md` - locked Phase 7 decisions, discretion, deferred scope, and code references. [VERIFIED: repo file]
- `.planning/REQUIREMENTS.md` - `SOFT-01` pending requirement. [VERIFIED: repo file]
- `.planning/STATE.md` - current blocker that `evaluateSoftPriors` is not wired into live runtime. [VERIFIED: repo file]
- `.planning/ROADMAP.md` - Phase 7 goal, success criteria, and plan list. [VERIFIED: repo file]
- `.planning/phases/04-corpus-priors-and-soft-pattern-layer/04-VERIFICATION.md` - Phase 4 runtime wiring gap evidence. [VERIFIED: repo file]
- `.planning/phases/05-natural-language-ingestion-and-review-api/05-VERIFICATION.md` - existing submit/review/approve/check proof. [VERIFIED: repo file]
- `src/services/soft-prior-evaluator.ts` - evaluator orchestration contract. [VERIFIED: repo file]
- `src/services/verdict-runner.ts` - hard verdict run integration point. [VERIFIED: repo file]
- `src/services/ingestion-check.ts` - manual check service propagation point. [VERIFIED: repo file]
- `src/api/routes/ingestion-check.ts` and `src/api/schemas.ts` - check API response parse/send contract. [VERIFIED: repo file]
- `src/corpus/normalization.ts` - canonical prior tokenization. [VERIFIED: repo file]
- `src/engine/prior-snapshot-loader.ts`, `src/engine/soft-prior-scoring.ts`, and `src/engine/repair-plausibility.ts` - prior runtime implementation. [VERIFIED: repo file]
- `tests/api/check-controls-api.test.ts`, `tests/engine/soft-prior-scoring.test.ts`, `tests/engine/repair-plausibility.test.ts`, and `tests/fixtures/soft-prior-fixtures.ts` - current regression and fixture patterns. [VERIFIED: repo file]
- `package.json`, `tsconfig.json`, `vitest.config.ts`, `npm ls`, `npm view` - local and registry dependency state. [VERIFIED: repo + npm registry]

### Secondary (MEDIUM confidence)
- OWASP ASVS GitHub repository - latest stable ASVS version and version-reference guidance. [CITED: https://github.com/OWASP/ASVS]

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - package versions were verified locally and against npm registry; no new package is required. [VERIFIED: `npm ls`, npm registry]
- Architecture: HIGH - integration points are locked in context and visible in current service/API code. [VERIFIED: `07-CONTEXT.md`, repo code]
- Pitfalls: HIGH - each pitfall corresponds to existing code behavior or a Phase 4 verification failure. [VERIFIED: repo code, `04-VERIFICATION.md`]
- Transition aggregation shape: MEDIUM - one top-level assessment is recommended from current evaluator shape and D-07, but multi-transition presentation is not implemented yet. [VERIFIED: `src/services/soft-prior-evaluator.ts`, `07-CONTEXT.md`]

**Research date:** 2026-04-10  
**Valid until:** 2026-04-17 for dependency/version details; repository integration findings remain valid until touched files change.
