# Phase 8: Interactive Inspection Surface - Research

**Researched:** 2026-04-10
**Domain:** TypeScript/Fastify inspection API plus minimal browser UI for verdict exploration
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Phase boundary

Phase 8 should create the first interactive inspection surface for StoryGraph's existing reasoning outputs. It should make verdicts, evidence, repairs, soft-prior advisory output, and linked event/state/rule traces explorable without requiring the user to inspect raw storage rows or test fixtures directly.

It should not expand into a full editor, full story graph product, automatic repair application flow, or raw corpus/prior browser.

#### Implementation Decisions

- **D-01:** Phase 8 should add a minimal frontend shell, not remain API-only.
- **D-02:** The frontend should be intentionally small and inspection-focused; exact stack is at the agent's discretion, but browser verification is required and this is not a design-system phase.
- **D-03:** Phase 8 should extend the existing Fastify APIs as needed, but the final proof must include an actual browser-usable view.
- **D-04:** The first screen should be organized around verdict-kind triage grouped by `Hard Contradiction`, `Repairable Gap`, `Soft Drift`, and `Consistent`.
- **D-05:** The triage list is the starting point; run history and diff information may exist but should be secondary.
- **D-06:** Selecting a verdict should drill into evidence, timeline, repair, and advisory information without losing the triage context.
- **D-07:** The detail view should default to concise, writer-readable evidence rather than raw IDs.
- **D-08:** Expandable trace fields should expose exact structured IDs and codes, including `findingId`, `reasonCode`, conflict path, missing premises, supporting findings, event IDs, state boundary IDs, and rule version IDs.
- **D-09:** Every visible judgment must remain traceable back to structured data, not just explanatory prose.
- **D-10:** The default layout should be a split view: left verdict triage list, right selected verdict details with event timeline and evidence detail.
- **D-11:** The timeline should show related event order and linked state/rule evidence; a full node graph is not required as the primary experience.
- **D-12:** Graph-first visualization is deferred. A graph projection can be secondary only if it supports the split-view inspection goal without becoming a new product surface.
- **D-13:** Repairs should appear inside the relevant hard verdict detail, not as a separate repair workspace.
- **D-14:** Soft-prior and soft-drift information should appear as a visually and semantically separate advisory band.
- **D-15:** The advisory band should expose the Phase 7 `softPrior` data that matters to a writer: status, dominant layer, representative pattern summary, triggered drifts, contribution evidence, repair plausibility adjustments, and unavailable-state reasons.
- **D-16:** Hard/soft boundaries must be explicit in both UI and API contracts: priors may explain drift or rerank repairs, but must never appear to override the hard verdict truth.

### Claude's Discretion

- Exact frontend stack and build tooling.
- Exact route names and API payload shape, as long as payloads are run-scoped and do not expose raw storage records.
- Component names, layout details, and copy.
- Whether run history/diff appears in the first Phase 8 pass or remains a secondary panel.

### Deferred Ideas (OUT OF SCOPE)

- Full graph-first visualization product.
- Raw prior browsing, corpus exploration, or source-work inspection.
- Automatic story repair application or rewrite generation.
- Full design system, collaboration, export, or advanced navigation.
</user_constraints>

## Summary

Phase 8 should add a small browser inspection surface backed by a run-scoped API that composes existing verdict, evidence, repair, diff, and soft-prior advisory data into a sanitized view model. The existing backend already stores verdict runs and verdict evidence, and Phase 7 already returns soft-prior advisory data separately from hard verdict truth, but repairs and soft-prior advisory results are not currently persisted with the run. [VERIFIED: codebase: src/services/verdict-runner.ts] [VERIFIED: codebase: src/storage/repositories/verdict-repository.ts] [VERIFIED: codebase: src/services/soft-prior-runtime.ts] [VERIFIED: .planning/phases/07-soft-prior-runtime-integration/07-VERIFICATION.md]

The planning-critical decision is whether Phase 8 inspection must replay the exact advisory/repair data produced at check time. If yes, add a sanitized inspection/advisory snapshot persisted at verdict-run time. If no, the inspection endpoint can recompute advisory/repair data from stored verdicts, but the displayed advisory can drift when prior snapshots or server config change. [VERIFIED: codebase: src/services/verdict-runner.ts] [VERIFIED: codebase: src/services/soft-prior-evaluator.ts] [ASSUMED]

**Primary recommendation:** Use a minimal React + Vite browser shell served by Fastify, add a `GET /api/inspection/runs/:runId` endpoint that returns a Zod-validated inspection DTO, and persist sanitized soft-prior/repair inspection data at check time so the UI does not expose raw storage records or raw prior artifacts. [VERIFIED: npm registry] [CITED: https://vite.dev/guide/] [CITED: https://react.dev/learn/add-react-to-an-existing-project] [VERIFIED: codebase]

## Project Constraints (from AGENTS.md)

- Every judgment must be traceable to explicit states, events, rules, or missing assumptions; black-box scoring is insufficient. [VERIFIED: AGENTS.md]
- The baseline world model follows real-world physical constraints unless user-defined world rules extend or override them. [VERIFIED: AGENTS.md]
- Frontier LLMs may assist extraction, interpretation, and repair suggestions, but deterministic consistency judgment must remain logic-led. [VERIFIED: AGENTS.md]
- Users may write natural language, but the engine must normalize input into structured internal representations. [VERIFIED: AGENTS.md]
- The first milestone prioritizes rule systems, schemas, taxonomies, and a working consistency core before ambitious UI or visualization work. [VERIFIED: AGENTS.md]
- Existing stack guidance prefers TypeScript, Fastify, Zod, Vitest, PostgreSQL-style storage contracts, clingo/ASP for hard reasoning, and DuckDB for corpus analytics. [VERIFIED: AGENTS.md]
- Avoid pure prompt-based verdicting, a single opaque consistency score, document-only storage with no normalized schema, and frequency-derived hard rules. [VERIFIED: AGENTS.md]
- GSD workflow enforcement requires starting file-changing work through a GSD command; this research is running as the Phase 8 research workflow. [VERIFIED: AGENTS.md]
- No project skill directories were found under `.claude/skills/` or `.agents/skills/`. [VERIFIED: filesystem]

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FLOW-02 | User can inspect consistency results in structured analysis view before advanced visualization is added. | Use a split-view inspection shell, grouped verdict triage, run-scoped inspection API, timeline derived from structured evidence, and browser verification. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/phases/08-interactive-inspection-surface/08-CONTEXT.md] |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | existing `5.9.3` | Shared API, service, and UI types | The repo is already strict TypeScript and includes source plus tests under one compiler config. [VERIFIED: package.json] [VERIFIED: tsconfig.json] |
| Fastify | existing `5.8.4` | API routes and static UI hosting | The current app already composes ingestion routes through Fastify. [VERIFIED: package.json] [VERIFIED: src/api/app.ts] |
| Zod | existing `4.1.12`; npm latest `4.3.6` published 2026-01-22 | Runtime DTO validation at API boundaries | Existing request/response schemas already use Zod, including the Phase 7 `softPrior` contract. [VERIFIED: package.json] [VERIFIED: npm registry] [VERIFIED: src/api/schemas.ts] |
| React | `19.2.5` published 2026-04-08 | Small component shell for split-view triage/detail UI | React fits selectable lists, expandable trace fields, and stateful detail panels without introducing a full design system. [VERIFIED: npm registry] [CITED: https://react.dev/learn/add-react-to-an-existing-project] |
| React DOM | `19.2.5` published 2026-04-08 | Browser rendering for React | Required peer for React browser rendering. [VERIFIED: npm registry] |
| Vite | `8.0.8` published 2026-04-09 | Frontend dev server and production build | Vite is the smallest standard browser build layer for a TypeScript UI in this repo; add it directly instead of relying on Vitest's transitive Vite package. [VERIFIED: npm registry] [CITED: https://vite.dev/guide/] |
| `@vitejs/plugin-react` | `6.0.1` published 2026-03-13 | React transform support in Vite | Official React integration for Vite. [VERIFIED: npm registry] [CITED: https://vite.dev/guide/] |
| `@fastify/static` | `9.1.0` published 2026-04-07 | Serve built UI from Fastify | Keeps API and browser surface in the existing Fastify app rather than adding another production server. [VERIFIED: npm registry] [CITED: https://github.com/fastify/fastify-static] |
| `@playwright/test` | `1.59.1` published 2026-04-01 | Browser verification | Phase 8 explicitly requires browser verification, and Playwright provides route-level browser assertions plus web-server orchestration. [VERIFIED: npm registry] [CITED: https://playwright.dev/docs/test-webserver] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | existing `3.2.4`; npm latest `4.1.4` published 2026-04-09 | Unit and API integration tests | Keep existing Vitest version for Phase 8 unless the planner intentionally schedules a test-runner upgrade. [VERIFIED: package.json] [VERIFIED: npm registry] |
| pg-mem | existing `3.0.5` | In-memory repository/API tests | Existing API tests already use pg-mem to exercise Fastify routes without external PostgreSQL. [VERIFIED: package.json] [VERIFIED: tests/api/check-controls-api.test.ts] |
| `@xyflow/react` | `12.10.2` published 2026-03-27 | Optional graph projection | Defer unless a secondary graph projection becomes necessary; the Phase 8 primary view is timeline-first. [VERIFIED: npm registry] [VERIFIED: 08-CONTEXT.md] |
| Cytoscape.js | `3.33.2` published 2026-04-06 | Optional graph visualization | Defer for the same reason; do not hand-roll graph layout if graph-first returns later. [VERIFIED: npm registry] [VERIFIED: 08-CONTEXT.md] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React + Vite | Vanilla TypeScript + Vite | Smaller dependency set, but selectable split view, detail state, and expandable trace controls become more hand-written UI code. [ASSUMED] |
| React + Vite | Server-rendered Fastify HTML | Avoids frontend build tooling, but makes interactive triage/detail/timeline state awkward and less testable in browser. [ASSUMED] |
| Timeline-first UI | React Flow or Cytoscape primary graph | Graph libraries are useful later, but Phase 8 locked graph-first visualization out of scope. [VERIFIED: 08-CONTEXT.md] |
| Keep existing Vitest/TypeScript versions | Upgrade Vitest and TypeScript to latest npm versions | Latest versions exist, but compiler/test-runner upgrades are not required to satisfy FLOW-02 and add avoidable blast radius. [VERIFIED: npm registry] [ASSUMED] |

**Installation:**

```bash
npm install react@19.2.5 react-dom@19.2.5 @fastify/static@9.1.0
npm install -D vite@8.0.8 @vitejs/plugin-react@6.0.1 @playwright/test@1.59.1
npx playwright install chromium
```

**Version verification:** Recommended new package versions above were checked with `npm view` on 2026-04-10. [VERIFIED: npm registry]

## Architecture Patterns

### Recommended Project Structure

```text
src/
  api/
    app.ts                         # Register inspection API and UI static route
    schemas.ts                     # Inspection request/response schemas
    routes/
      inspection.ts                # Run-scoped inspection endpoints
  services/
    inspection-payload.ts          # Compose sanitized run inspection DTO
    inspection-view-model.ts       # Group verdicts, build timeline, redact advisory data
  storage/
    repositories/
      verdict-run-inspection-repository.ts  # Persist sanitized advisory/repair snapshot if chosen
  ui/
    App.tsx
    main.tsx
    inspection-client.ts
    types.ts
    components/
      VerdictTriageList.tsx
      VerdictDetailPanel.tsx
      EvidenceTimeline.tsx
      SoftPriorAdvisoryBand.tsx
      TraceFields.tsx
    styles.css
tests/
  api/
    inspection-api.test.ts
  services/
    inspection-payload.test.ts
  browser/
    inspection-surface.spec.ts
vite.config.ts
playwright.config.ts
```

This structure keeps backend composition, DTO shaping, and UI rendering separate, while using current repo conventions for `src/services`, `src/api/routes`, and `tests/api`. [VERIFIED: codebase] [ASSUMED]

### Pattern 1: Run-Scoped Inspection DTO

**What:** Add a run-scoped read endpoint that returns a UI-ready DTO rather than raw `verdicts` rows. [VERIFIED: codebase]

**Recommended route:** `GET /api/inspection/runs/:runId` [ASSUMED]

**Payload shape:**

```typescript
export type RunInspectionResponse = {
  run: {
    runId: string;
    storyId: string;
    revisionId: string;
    previousRunId: string | null;
    triggerKind: string;
    createdAt: string;
  };
  groups: Array<{
    verdictKind: "Hard Contradiction" | "Repairable Gap" | "Soft Drift" | "Consistent";
    count: number;
    verdicts: VerdictSummary[];
  }>;
  selectedVerdictId: string | null;
  detailsByVerdictId: Record<string, VerdictInspectionDetail>;
  diff: {
    addedFindingIds: string[];
    resolvedFindingIds: string[];
    persistedFindingIds: string[];
    representativeVerdictChanged: boolean;
  } | null;
};
```

This uses run IDs as the navigation boundary and keeps run history/diff secondary to triage. [VERIFIED: 08-CONTEXT.md] [VERIFIED: codebase: src/services/verdict-diff.ts]

### Pattern 2: Sanitized Inspection Snapshot at Check Time

**What:** Persist only the UI-safe inspection advisory data produced during `executeVerdictRun`, not raw prior snapshots or raw storage records. [VERIFIED: codebase] [VERIFIED: .planning/phases/07-soft-prior-runtime-integration/07-SECURITY.md]

**When to use:** Use this if Phase 8 must show the same soft-prior status, dominant layer, triggered drifts, contribution evidence, reranked repairs, and adjustment values later when the user reopens a run. [VERIFIED: 08-CONTEXT.md]

**Why:** Phase 7 returns `softPrior` from `executeVerdictRun`, but the current repositories persist only the hard verdict run and verdict records. [VERIFIED: codebase: src/services/verdict-runner.ts] [VERIFIED: codebase: src/storage/repositories/verdict-run-repository.ts] [VERIFIED: codebase: src/storage/repositories/verdict-repository.ts]

**Avoid:** Do not expose `PriorSnapshot`, `snapshotSet`, `sourceWorkIds`, server `snapshotDir`, or request-supplied prior config. [VERIFIED: codebase: src/domain/priors.ts] [VERIFIED: .planning/phases/07-soft-prior-runtime-integration/07-SECURITY.md]

### Pattern 3: Verdict Kind Triage Order

**What:** Render deterministic groups in the locked order: `Hard Contradiction`, `Repairable Gap`, `Soft Drift`, `Consistent`. [VERIFIED: 08-CONTEXT.md]

**When to use:** Use for both API DTO grouping and UI list ordering so browser tests can assert stable structure. [ASSUMED]

**Example:**

```typescript
const VERDICT_KIND_ORDER = [
  "Hard Contradiction",
  "Repairable Gap",
  "Soft Drift",
  "Consistent",
] as const;

export function groupVerdictsForInspection(verdicts: VerdictRecord[]) {
  return VERDICT_KIND_ORDER.map((verdictKind) => ({
    verdictKind,
    count: verdicts.filter((verdict) => verdict.verdictKind === verdictKind).length,
    verdicts: verdicts
      .filter((verdict) => verdict.verdictKind === verdictKind)
      .map(toVerdictSummary),
  }));
}
```

### Pattern 4: Timeline from Evidence, Not New Reasoning

**What:** Build timeline items from `verdict.evidence.eventSummaries`, and attach linked `stateSummaries`, `ruleSummaries`, conflict path, missing premises, and supporting findings as detail fields. [VERIFIED: codebase: src/domain/verdicts.ts] [VERIFIED: codebase: src/engine/evidence-snapshots.ts]

**When to use:** This satisfies the timeline requirement without adding a new graph engine or new reasoning semantics. [VERIFIED: 08-CONTEXT.md]

**Example:**

```typescript
export function buildEvidenceTimeline(evidence: VerdictEvidence): TimelineItem[] {
  return evidence.eventSummaries
    .slice()
    .sort((left, right) => left.sequence - right.sequence)
    .map((event) => ({
      eventId: event.eventId,
      sequence: event.sequence,
      summary: event.summary,
      relatedStateBoundaryIds: evidence.stateBoundaryIds,
      relatedRuleVersionIds: evidence.ruleVersionIds,
      conflictPath: evidence.conflictPath,
    }));
}
```

### Anti-Patterns to Avoid

- **Raw-row API:** Returning database-shaped `verdicts` or prior snapshots couples the UI to storage and risks leaking fields that Phase 7 intentionally hides. [VERIFIED: codebase] [VERIFIED: 07-SECURITY.md]
- **Soft-prior truth override:** Displaying a prior advisory as if it changed `verdictKind` violates Phase 7's hard/soft boundary. [VERIFIED: 08-CONTEXT.md] [VERIFIED: 07-VERIFICATION.md]
- **Graph-first expansion:** A node graph as the primary Phase 8 surface contradicts the locked timeline-first split-view decision. [VERIFIED: 08-CONTEXT.md]
- **Mock-only browser proof:** Browser verification must exercise an actual browser-usable view, not just a mocked component or API unit test. [VERIFIED: 08-CONTEXT.md]

## API and Service Additions Needed

| Addition | Purpose | Planning Notes |
|----------|---------|----------------|
| `GET /api/inspection/runs/:runId` | Fetch full run inspection DTO | Backed by `VerdictRunRepository.getById`, `VerdictRepository.listForRun`, optional advisory snapshot repository, and `diffAgainstPreviousRun`. [VERIFIED: codebase] [ASSUMED] |
| `RunInspectionResponseSchema` | Validate response contract | Add to `src/api/schemas.ts` using existing Zod pattern. [VERIFIED: src/api/schemas.ts] |
| `buildRunInspectionPayload` service | Compose view model | Keep route thin; service owns grouping, detail shaping, timeline derivation, redaction, and unavailable advisory states. [VERIFIED: codebase patterns] [ASSUMED] |
| `VerdictRunInspectionRepository` or equivalent | Persist sanitized soft-prior/repair snapshot | Required if reopened runs must display exact advisory output from check time. [VERIFIED: 07-VERIFICATION.md] [ASSUMED] |
| UI static registration | Serve built inspection shell | Register `@fastify/static` under an inspection prefix and keep `/api/*` paths distinct. [VERIFIED: npm registry] [CITED: https://github.com/fastify/fastify-static] |
| Browser test fixture | Prove end-to-end browser usability | Use Playwright with a seeded Fastify server or a deterministic test server. [CITED: https://playwright.dev/docs/test-webserver] [ASSUMED] |

### Suggested Inspection Detail Fields

| Field | Source | Exposure Rule |
|-------|--------|---------------|
| `findingId` | `verdict.evidence.findingId` | Always available in trace expansion when present. [VERIFIED: src/domain/verdicts.ts] |
| `reasonCode` | `verdict.evidence.reasonCode` | Display in trace expansion and summary labels. [VERIFIED: src/domain/verdicts.ts] |
| `conflictPath` | `verdict.evidence.conflictPath` | Writer-readable view plus raw expandable trace. [VERIFIED: src/domain/verdicts.ts] |
| `missingPremises` | `verdict.evidence.missingPremises` | Key detail for repairable gaps. [VERIFIED: src/domain/verdicts.ts] |
| `supportingFindings` | `verdict.evidence.supportingFindings` | Secondary detail under representative verdicts. [VERIFIED: src/domain/verdicts.ts] |
| `eventIds` and summaries | `verdict.evidence.eventIds`, `eventSummaries` | Timeline input. [VERIFIED: src/domain/verdicts.ts] |
| `stateBoundaryIds` and summaries | `verdict.evidence.stateBoundaryIds`, `stateSummaries` | Linked state evidence. [VERIFIED: src/domain/verdicts.ts] |
| `ruleVersionIds` and summaries | `verdict.evidence.ruleVersionIds`, `ruleSummaries` | Linked rule evidence. [VERIFIED: src/domain/verdicts.ts] |
| `softPrior.status` | Phase 7 runtime output or persisted snapshot | Display in a separate advisory band. [VERIFIED: src/services/soft-prior-runtime.ts] [VERIFIED: 08-CONTEXT.md] |
| `dominantPriorLayer`, `representativePatternSummary`, `triggeredDrifts`, `contributions`, `repairPlausibilityAdjustments` | Phase 7 soft-prior output | Sanitize and keep advisory-only. [VERIFIED: src/domain/priors.ts] [VERIFIED: 07-SECURITY.md] |

## Hard/Soft Boundary Rules

- `verdictKind` is the authoritative hard result field for the verdict row, and `softPrior` must remain a separate advisory object. [VERIFIED: src/domain/verdicts.ts] [VERIFIED: src/api/schemas.ts] [VERIFIED: 07-VERIFICATION.md]
- `Soft Drift` is a verdict kind in the domain schema, but Phase 7 `softPrior` is also an advisory evaluation object; the UI should label these separately to avoid implying that priors changed hard truth. [VERIFIED: src/domain/verdicts.ts] [VERIFIED: src/services/soft-prior-runtime.ts] [ASSUMED]
- Repair candidates are suggestions attached to findings, not automatic edits or truth changes. [VERIFIED: 03-CONTEXT.md] [VERIFIED: src/domain/repairs.ts]
- Prior contributions can explain plausibility and drift but cannot create hard contradictions or make a hard contradiction disappear. [VERIFIED: 04-CONTEXT.md] [VERIFIED: 07-CONTEXT.md] [VERIFIED: 07-VERIFICATION.md]
- The API should preserve this boundary structurally by keeping `hardVerdict`/`evidence` fields separate from `advisory` fields, not just by UI copy. [ASSUMED]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Frontend build, HMR, and production assets | Custom TypeScript browser bundler | Vite | Vite handles TypeScript browser builds and integrates with backend-serving workflows. [CITED: https://vite.dev/guide/] |
| Stateful split-view UI | Manual DOM diffing and custom state system | React | Verdict selection, trace expansion, and advisory panels need predictable UI state. [CITED: https://react.dev/learn/add-react-to-an-existing-project] [ASSUMED] |
| Static asset serving | Bespoke file streaming route | `@fastify/static` | Official Fastify plugin covers static roots, prefixes, and asset responses. [CITED: https://github.com/fastify/fastify-static] |
| Browser verification | Screenshot-only manual testing | Playwright | Browser assertions and web-server orchestration can be automated in CI. [CITED: https://playwright.dev/docs/test-webserver] |
| API DTO validation | Ad hoc object checks | Existing Zod schema pattern | The repo already validates API requests and responses with Zod. [VERIFIED: src/api/schemas.ts] |
| Inspection storage access | SQL in route handlers | Existing repositories plus new service | Current routes delegate domain work to services and repositories. [VERIFIED: src/api/routes/ingestion-check.ts] [VERIFIED: src/services/ingestion-check.ts] |
| Graph layout, if later needed | Custom force-directed graph engine | `@xyflow/react` or Cytoscape.js | Graph-first is deferred; if later required, use established graph libraries. [VERIFIED: npm registry] [VERIFIED: 08-CONTEXT.md] |
| Prior artifact browsing | Direct `PriorSnapshot` exposure | Sanitized advisory DTO | Phase 7 security closed raw prior/source-work disclosure threats by avoiding raw artifact exposure. [VERIFIED: 07-SECURITY.md] |

**Key insight:** Phase 8 is not a reasoning phase. The safest plan is to compose, sanitize, and render existing structured outputs while preserving their original authority boundaries. [VERIFIED: 08-CONTEXT.md] [VERIFIED: codebase]

## Common Pitfalls

### Pitfall 1: Recomputing Historical Advisory Data on Read

**What goes wrong:** A reopened run can show different soft-prior status, drift scores, or reranked repairs if prior snapshots or server config changed after the original check. [VERIFIED: codebase: src/services/soft-prior-runtime.ts] [ASSUMED]

**Why it happens:** Phase 7 currently returns `softPrior` at runtime and persists hard verdicts/runs, but not advisory output or repairs. [VERIFIED: src/services/verdict-runner.ts] [VERIFIED: src/storage/repositories/verdict-run-repository.ts]

**How to avoid:** Persist a sanitized advisory/repair inspection snapshot at check time, or explicitly mark inspection advisory as recomputed and not historical. [ASSUMED]

**Warning signs:** Inspection endpoint calls `evaluateConfiguredSoftPrior` directly without a snapshot freshness label or persisted advisory fallback. [ASSUMED]

### Pitfall 2: Blurring Hard Verdicts and Priors

**What goes wrong:** The UI implies that corpus priors can downgrade or override `Hard Contradiction`. [VERIFIED: 07-CONTEXT.md]

**Why it happens:** Advisory reranking and drift data are visually near verdict truth without structural separation. [ASSUMED]

**How to avoid:** Use separate API fields, separate component boundaries, and clear labels such as `Advisory pattern signal` instead of merging prior data into verdict summaries. [ASSUMED]

**Warning signs:** Response schemas add `softPrior` fields inside `VerdictRecord`, or UI badges derive hard verdict labels from prior scores. [ASSUMED]

### Pitfall 3: Leaking Raw Prior or Corpus Data

**What goes wrong:** The inspection API exposes `sourceWorkIds`, raw `PriorSnapshot`, snapshot directories, or corpus artifact internals. [VERIFIED: src/domain/priors.ts] [VERIFIED: 07-SECURITY.md]

**Why it happens:** The UI requests raw runtime objects instead of a sanitized DTO. [ASSUMED]

**How to avoid:** Whitelist advisory fields: status, dominant layer, representative pattern summary, triggered drift type, contribution confidence/weight/score/threshold, and repair plausibility adjustment. [VERIFIED: 08-CONTEXT.md] [ASSUMED]

**Warning signs:** `rg "sourceWorkIds|snapshotDir|snapshotSet" src/api src/ui` finds response payload exposure. [ASSUMED]

### Pitfall 4: Turning the Phase into a Graph Product

**What goes wrong:** Planning spends the phase building graph layout, pan/zoom, and node styling instead of verdict inspection. [VERIFIED: 08-CONTEXT.md]

**Why it happens:** The roadmap mentions timeline or graph, but the context locks timeline-first split view and defers graph-first work. [VERIFIED: ROADMAP.md] [VERIFIED: 08-CONTEXT.md]

**How to avoid:** Make timeline the required visual trace and treat graph projection as optional secondary output. [VERIFIED: 08-CONTEXT.md]

**Warning signs:** Plan 08-02 starts with React Flow/Cytoscape before grouped verdict detail is working. [ASSUMED]

### Pitfall 5: Browser Verification Without the Real App Boundary

**What goes wrong:** Tests pass component rendering against mock JSON, but the deployed Fastify route cannot serve the UI or the UI cannot fetch the inspection API. [ASSUMED]

**Why it happens:** Browser tests are written below the route/static integration boundary. [ASSUMED]

**How to avoid:** Add at least one Playwright smoke test that opens the served inspection page, loads seeded run data through the real API, selects a verdict, and asserts the advisory/timeline/detail panels. [CITED: https://playwright.dev/docs/writing-tests] [ASSUMED]

**Warning signs:** No `playwright.config.ts`, no browser test, or browser test imports React components directly without navigation. [ASSUMED]

### Pitfall 6: Depending on Transitive Tooling

**What goes wrong:** `vite` appears in `package-lock.json` through Vitest, but no direct Vite app dependency or config exists for the UI. [VERIFIED: package-lock.json] [VERIFIED: package.json]

**Why it happens:** Vitest uses Vite internally, which can hide the absence of an explicit browser build contract. [ASSUMED]

**How to avoid:** Add direct `vite` and `@vitejs/plugin-react` dev dependencies with `vite.config.ts` and build scripts. [VERIFIED: npm registry] [ASSUMED]

**Warning signs:** `npm run build:ui` depends on `node_modules/.bin/vite` without `vite` in direct dev dependencies. [ASSUMED]

## Code Examples

Verified patterns from current codebase and official docs:

### Inspection Route Pattern

```typescript
// Source: existing Fastify route pattern in src/api/routes/ingestion-check.ts
app.get("/api/inspection/runs/:runId", async (request, reply) => {
  const params = InspectionRunParamsSchema.parse(request.params);
  const payload = await buildRunInspectionPayload({
    runId: params.runId,
    verdictRunRepository: dependencies.verdictRunRepository,
    verdictRepository: dependencies.verdictRepository,
    inspectionRepository: dependencies.inspectionRepository,
  });

  return reply.code(200).send(RunInspectionResponseSchema.parse(payload));
});
```

### Zod Response Boundary

```typescript
// Source: existing schema pattern in src/api/schemas.ts
export const InspectionGroupSchema = z.object({
  verdictKind: VerdictKindSchema,
  count: z.number().int().nonnegative(),
  verdicts: z.array(InspectionVerdictSummarySchema),
});

export const RunInspectionResponseSchema = z.object({
  run: InspectionRunSchema,
  groups: z.array(InspectionGroupSchema),
  selectedVerdictId: z.string().nullable(),
  detailsByVerdictId: z.record(z.string(), InspectionVerdictDetailSchema),
  diff: InspectionDiffSchema.nullable(),
});
```

### Advisory Band Contract

```typescript
// Source: Phase 7 soft-prior runtime shape in src/api/schemas.ts and src/services/soft-prior-runtime.ts
export const InspectionAdvisorySchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("available"),
    dominantPriorLayer: z.string().nullable(),
    representativePatternSummary: z.string().nullable(),
    triggeredDrifts: z.array(z.object({ driftType: z.string(), severity: z.string() })),
    contributions: z.array(SanitizedPriorContributionSchema),
    repairPlausibilityAdjustments: z.array(SanitizedRepairAdjustmentSchema),
  }),
  z.object({
    status: z.enum(["disabled", "missing_snapshot", "invalid_snapshot", "insufficient_context"]),
    reason: z.string(),
  }),
]);
```

### Static UI Registration

```typescript
// Source: @fastify/static official plugin pattern
await app.register(fastifyStatic, {
  root: uiDistDir,
  prefix: "/inspection/",
});
```

### Browser Verification Pattern

```typescript
// Source: Playwright test pattern from official docs
import { expect, test } from "@playwright/test";

test("user can inspect grouped verdict detail", async ({ page }) => {
  await page.goto("/inspection/runs/run_test_1");
  await expect(page.getByRole("heading", { name: "Hard Contradiction" })).toBeVisible();
  await page.getByRole("button", { name: /Hard Contradiction/ }).first().click();
  await expect(page.getByText("Evidence timeline")).toBeVisible();
  await expect(page.getByText("Advisory pattern signal")).toBeVisible();
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| API-only inspection through tests or raw records | Browser-usable inspection shell with run-scoped DTO | Phase 8 requirement | Planner must include UI build, static serving, and browser verification. [VERIFIED: 08-CONTEXT.md] |
| Raw verdict rows as UI model | Sanitized view model grouped by verdict kind | Phase 8 requirement | Planner must add service-level DTO composition. [VERIFIED: 08-CONTEXT.md] [ASSUMED] |
| Soft-prior output as transient check response | Persisted or explicitly recomputed advisory inspection data | Phase 8 planning decision | Planner must decide historical fidelity before writing endpoint tasks. [VERIFIED: 07-VERIFICATION.md] [ASSUMED] |
| Graph-first visualization | Timeline-first split view, graph deferred | Phase 8 locked decision | Planner should not lead with graph libraries. [VERIFIED: 08-CONTEXT.md] |

**Deprecated/outdated for this phase:**

- Create React App: do not introduce it; use Vite for this small TS browser shell. [ASSUMED]
- Raw corpus/prior browsing: explicitly out of scope. [VERIFIED: 08-CONTEXT.md]
- Single consistency score as the primary UI: conflicts with project constraints and typed violation model. [VERIFIED: AGENTS.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | React + Vite is acceptable as the minimal frontend stack. | Standard Stack | If the user expects zero new framework dependencies, the planner should swap to vanilla TypeScript + Vite and simplify component tasks. |
| A2 | Phase 8 should persist a sanitized advisory/repair inspection snapshot for replay fidelity. | Summary, Architecture Patterns | If persistence is not desired, inspection must clearly label advisory data as recomputed or omit historical advisory reopening. |
| A3 | The first inspection surface is local/internal and not a public multi-user product. | Security Domain | If public or multi-user exposure is required, access control and authorization become Phase 8 blockers, not optional hardening. |
| A4 | Existing npm workflow should continue instead of switching to pnpm for this phase. | Standard Stack | If the project decides to adopt pnpm now, install and script tasks need package-manager migration work. |
| A5 | Playwright-managed Chromium installation is acceptable for browser verification. | Environment Availability | If managed browser installs are forbidden, the planner must require system Chromium/Chrome installation or a CI image with browsers preinstalled. |

## Open Questions (RESOLVED)

1. **Should Phase 8 persist sanitized advisory and repair snapshots?**
   - What we know: Phase 7 returns `softPrior` at check time, but current repositories persist only runs and hard verdict records. [VERIFIED: 07-VERIFICATION.md] [VERIFIED: codebase]
   - What's unclear: Whether inspection must show exact historical advisory data after prior config or snapshots change. [ASSUMED]
   - Recommendation: Persist a sanitized inspection snapshot because Phase 8 is about inspecting a run, not recalculating a new advisory view. [ASSUMED]
   - **RESOLVED:** Phase 8 planning will persist a sanitized inspection snapshot at check time. The read API must not recompute soft-prior advisory data for historical runs.

2. **Is the inspection surface local-only for v1?**
   - What we know: The project has no authentication or authorization layer in the inspected Fastify app. [VERIFIED: src/api/app.ts]
   - What's unclear: Whether Phase 8 will be exposed beyond a trusted local/dev environment. [ASSUMED]
   - Recommendation: Keep the surface local/internal for Phase 8 or add explicit access-control requirements before exposing run IDs publicly. [ASSUMED]
   - **RESOLVED:** Phase 8 treats the inspection surface as local/internal. Public or multi-user exposure requires a later explicit access-control phase.

3. **Should navigation start from latest run or explicit run ID?**
   - What we know: The repository can fetch latest run by revision and list runs for a revision. [VERIFIED: src/storage/repositories/verdict-run-repository.ts]
   - What's unclear: Whether the first route should be `/inspection/runs/:runId`, `/inspection/revisions/:revisionId/latest`, or both. [ASSUMED]
   - Recommendation: Make `runId` the canonical inspection route and optionally add a latest-run redirect/helper later. [ASSUMED]
   - **RESOLVED:** `/inspection/runs/:runId` is the canonical browser route and `/api/inspection/runs/:runId` is the canonical JSON route for Phase 8.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | TypeScript build, Vite, tests | yes | `v25.8.2` | Project stack recommends Node 24 LTS; avoid Node 25-only features. [VERIFIED: command: node --version] [VERIFIED: AGENTS.md] |
| npm | Dependency install and scripts | yes | `11.12.1` | None needed. [VERIFIED: command: npm --version] |
| npx | Playwright browser install | yes | `11.12.1` | Use local `node_modules/.bin` commands after install. [VERIFIED: command: npx --version] |
| Vite CLI | UI build/dev server | no direct dependency | Transitive package exists through Vitest, but no direct dependency | Add direct `vite` dev dependency. [VERIFIED: package.json] [VERIFIED: package-lock.json] |
| Playwright package | Browser verification | no | Not installed | Add `@playwright/test`. [VERIFIED: package.json] |
| Chromium/Chrome executable | Browser verification | no system executable found | - | Run `npx playwright install chromium` after adding Playwright. [VERIFIED: command: command -v chromium/google-chrome] |
| PostgreSQL service | External DB validation | not required for current tests | - | Existing API tests use pg-mem; no external PostgreSQL dependency is needed for Phase 8 validation unless planner adds live DB checks. [VERIFIED: tests/api/check-controls-api.test.ts] |

**Missing dependencies with no fallback:**

- Browser verification is blocked until `@playwright/test` and a Chromium browser are installed. API/Vitest tests are not a sufficient substitute for the browser-proof requirement. [VERIFIED: package.json] [VERIFIED: 08-CONTEXT.md]

**Missing dependencies with fallback:**

- Direct Vite dependency is missing, but installation is straightforward and should be a Wave 0 task. [VERIFIED: package.json] [VERIFIED: npm registry]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Unit/API framework | Vitest `3.2.4` existing. [VERIFIED: package.json] |
| Browser framework | Add `@playwright/test` `1.59.1`. [VERIFIED: npm registry] |
| Existing config file | `vitest.config.ts`. [VERIFIED: filesystem] |
| Missing config file | `playwright.config.ts` does not exist yet. [VERIFIED: filesystem] |
| Quick run command | `npm run typecheck && npm run test -- tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts` [ASSUMED] |
| Browser run command | `npm run test:browser` after adding Playwright config and script. [ASSUMED] |
| Full suite command | `npm run typecheck && npm run test && npm run build && npm run test:browser` after adding UI/browser scripts. [ASSUMED] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| FLOW-02 | Verdicts are grouped by `Hard Contradiction`, `Repairable Gap`, `Soft Drift`, and `Consistent`. | service + API + browser | `npm run test -- tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts && npm run test:browser` | No - Wave 0 |
| FLOW-02 | Selecting a verdict shows evidence, trace fields, repair data, and advisory band without losing triage context. | browser | `npm run test:browser` | No - Wave 0 |
| FLOW-02 | Timeline displays linked event order plus state and rule evidence. | service + browser | `npm run test -- tests/services/inspection-payload.test.ts && npm run test:browser` | No - Wave 0 |
| FLOW-02 | Hard/soft boundaries remain explicit in API and UI. | schema + API + browser | `npm run test -- tests/api/inspection-api.test.ts && npm run test:browser` | No - Wave 0 |
| FLOW-02 | Raw prior artifacts and raw storage records are not exposed. | API + security regression | `npm run test -- tests/api/inspection-api.test.ts` plus `rg "sourceWorkIds|snapshotDir|snapshotSet" src/api src/ui tests` | No - Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run typecheck` and the most relevant Vitest file. [ASSUMED]
- **Per wave merge:** `npm run typecheck && npm run test` plus Playwright browser smoke once UI/static routing exists. [ASSUMED]
- **Phase gate:** Full suite plus browser verification green before `/gsd-verify-work`. [ASSUMED]

### Wave 0 Gaps

- [ ] `vite.config.ts` - UI build config. [VERIFIED: missing filesystem]
- [ ] `playwright.config.ts` - browser test web-server and base URL config. [VERIFIED: missing filesystem]
- [ ] `src/ui/` - browser app shell and components. [VERIFIED: missing filesystem]
- [ ] `src/api/routes/inspection.ts` - inspection API route. [VERIFIED: missing filesystem]
- [ ] `src/services/inspection-payload.ts` - DTO composition service. [VERIFIED: missing filesystem]
- [ ] `tests/services/inspection-payload.test.ts` - grouping, timeline, redaction tests. [VERIFIED: missing filesystem]
- [ ] `tests/api/inspection-api.test.ts` - seeded Fastify route tests. [VERIFIED: missing filesystem]
- [ ] `tests/browser/inspection-surface.spec.ts` - actual browser inspection proof. [VERIFIED: missing filesystem]
- [ ] `package.json` scripts for `build:ui`, `test:browser`, and any preview/server script needed by Playwright. [VERIFIED: package.json]
- [ ] Playwright browser install: `npx playwright install chromium`. [VERIFIED: environment]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | No for trusted local v1; yes if publicly exposed | Do not treat ingestion session IDs or run IDs as authentication. Add real auth before public exposure. [VERIFIED: codebase no auth layer] [ASSUMED] |
| V3 Session Management | No new browser login session in Phase 8 | Avoid adding ad hoc cookie/session state. [ASSUMED] |
| V4 Access Control | Conditional | If multiple users or public deployment enter scope, enforce story/run ownership before returning inspection payloads. [ASSUMED] |
| V5 Input Validation | Yes | Validate route params and response DTOs with Zod; reject malformed run IDs. [VERIFIED: src/api/schemas.ts] [ASSUMED] |
| V6 Cryptography | No new crypto | Do not invent hashing/encryption for trace IDs or advisory data. [ASSUMED] |
| V7 Error Handling | Yes | Return not-found and validation errors without leaking storage rows, filesystem paths, snapshot dirs, or stack traces. [ASSUMED] |
| V9 Data Protection | Yes | Redact raw prior artifacts, `sourceWorkIds`, and raw source/corpus details from browser DTOs. [VERIFIED: src/domain/priors.ts] [VERIFIED: 07-SECURITY.md] |
| V12 File and Resources | No file upload in Phase 8 | Keep static serving constrained to built UI assets. [ASSUMED] |
| V14 Configuration | Yes | Prior snapshot config remains server-controlled; inspection requests must not accept snapshot paths, weights, or prior config overrides. [VERIFIED: 07-SECURITY.md] |

### Known Threat Patterns for Phase 8

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Run ID enumeration exposes other story runs | Information Disclosure | Keep local-only in Phase 8 or add run/story authorization before public exposure. [ASSUMED] |
| Raw prior artifact leakage | Information Disclosure | Sanitize advisory DTO and regression-test that `sourceWorkIds`, `snapshotSet`, and `snapshotDir` are absent from API/UI payloads. [VERIFIED: 07-SECURITY.md] [ASSUMED] |
| XSS from story text, event summaries, or evidence strings | Tampering / Elevation | Use React text rendering; avoid `dangerouslySetInnerHTML`; sanitize any future rich text. [ASSUMED] |
| Hard/soft spoofing through merged fields | Spoofing | Keep hard verdict fields and advisory fields separate in schema and UI. [VERIFIED: 07-VERIFICATION.md] [VERIFIED: 08-CONTEXT.md] |
| Large run payload overwhelms browser | Denial of Service | Return run-scoped payload, cap or collapse long trace arrays, and lazy-expand raw trace fields. [ASSUMED] |
| Static UI route shadows API routes | Tampering / Availability | Serve UI under `/inspection/` and keep `/api/` route prefix distinct. [ASSUMED] |

## Sources

### Primary (HIGH confidence)

- `.planning/phases/08-interactive-inspection-surface/08-CONTEXT.md` - user decisions, locked UI boundaries, hard/soft display requirements. [VERIFIED: file read]
- `.planning/REQUIREMENTS.md` - `FLOW-02` requirement. [VERIFIED: file read]
- `.planning/ROADMAP.md` - Phase 8 goal, success criteria, and plan split. [VERIFIED: file read]
- `.planning/STATE.md` - Phase 8 state and Phase 7 completion state. [VERIFIED: file read]
- `.planning/phases/02-hard-constraint-engine/02-CONTEXT.md` - hard contradiction vs repairable gap semantics. [VERIFIED: file read]
- `.planning/phases/03-evidence-and-repair-reasoning/03-CONTEXT.md` - evidence, repair, and diff semantics. [VERIFIED: file read]
- `.planning/phases/04-corpus-priors-and-soft-pattern-layer/04-CONTEXT.md` - soft priors are advisory and not hard rules. [VERIFIED: file read]
- `.planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md` - approved ingestion check flow. [VERIFIED: file read]
- `.planning/phases/07-soft-prior-runtime-integration/07-CONTEXT.md` - Phase 7 hard/soft boundary decisions. [VERIFIED: file read]
- `.planning/phases/07-soft-prior-runtime-integration/07-VERIFICATION.md` - Phase 7 verified runtime behavior and persistence caveat. [VERIFIED: file read]
- `.planning/phases/07-soft-prior-runtime-integration/07-SECURITY.md` - Phase 7 security constraints for prior advisory exposure. [VERIFIED: file read]
- `AGENTS.md` - project and workflow constraints. [VERIFIED: file read]
- `package.json`, `tsconfig.json`, `vitest.config.ts` - current package, compiler, and test state. [VERIFIED: codebase]
- `src/api/app.ts`, `src/api/schemas.ts`, `src/api/routes/ingestion-check.ts`, `src/api/routes/ingestion-read.ts` - current API patterns. [VERIFIED: codebase]
- `src/services/verdict-runner.ts`, `src/services/ingestion-check.ts`, `src/services/explained-verdicts.ts`, `src/services/verdict-diff.ts`, `src/services/story-boundary-query.ts` - service composition and evidence/diff behavior. [VERIFIED: codebase]
- `src/storage/repositories/verdict-repository.ts`, `src/storage/repositories/verdict-run-repository.ts` - current persisted run/verdict data. [VERIFIED: codebase]
- `src/domain/verdicts.ts`, `src/domain/priors.ts`, `src/domain/repairs.ts` - current domain contracts. [VERIFIED: codebase]
- `tests/api/check-controls-api.test.ts` - current pg-mem/Fastify API test pattern and Phase 7 assertions. [VERIFIED: codebase]
- npm registry via `npm view` - current versions and publish times for recommended packages. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)

- Vite official guide - frontend build and backend integration reference: https://vite.dev/guide/ and https://vite.dev/guide/backend-integration. [CITED]
- React official existing-project guide - React adoption reference: https://react.dev/learn/add-react-to-an-existing-project. [CITED]
- Playwright official docs - browser tests and web-server orchestration: https://playwright.dev/docs/writing-tests and https://playwright.dev/docs/test-webserver. [CITED]
- `@fastify/static` official repository - Fastify static asset plugin behavior: https://github.com/fastify/fastify-static. [CITED]
- OWASP ASVS project - security category framing: https://owasp.org/www-project-application-security-verification-standard/. [CITED]

### Tertiary (LOW confidence)

- No tertiary web-only claims are required for planning. [VERIFIED: research scope]

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - package versions were checked against npm registry and existing repo dependencies were inspected. [VERIFIED: npm registry] [VERIFIED: package.json]
- Architecture: MEDIUM - API/service boundaries are strongly grounded in codebase patterns, but the advisory snapshot persistence choice remains a planning decision. [VERIFIED: codebase] [ASSUMED]
- Pitfalls: MEDIUM - persistence, security, and boundary pitfalls are grounded in Phase 7 artifacts and code; UI ergonomics risks are partly inferred. [VERIFIED: 07-VERIFICATION.md] [VERIFIED: 07-SECURITY.md] [ASSUMED]
- Validation: MEDIUM - Vitest path is verified, while Playwright setup is recommended and not yet installed. [VERIFIED: package.json] [VERIFIED: environment] [ASSUMED]
- Security: MEDIUM - prior-leakage boundaries are verified from Phase 7, while auth/access-control scope depends on deployment assumptions. [VERIFIED: 07-SECURITY.md] [ASSUMED]

**Research date:** 2026-04-10
**Valid until:** 2026-04-17 for npm/browser-tooling versions; 2026-05-10 for codebase and phase-decision findings unless Phase 7/8 contracts change.
