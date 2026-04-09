# Phase 5: Natural-Language Ingestion and Review API - Research

**Researched:** 2026-04-10
**Domain:** First HTTP API surface, schema-first natural-language extraction, review-session persistence, approval-gated canonical promotion, and manual verdict triggering
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** The intake API supports both `scene/synopsis chunk` submissions and `full story draft` submissions.
- **D-02:** Full story drafts are automatically segmented into reviewable scene/segment units before review.
- **D-03:** A submission may either target an existing `storyId/revisionId` or start a new draft session.
- **D-04:** Automatic segment boundaries remain user-editable during review.
- **D-05:** Review is performed through structured field editing, not free-text annotation-first correction.
- **D-06:** Approval happens at the scene/segment level.
- **D-07:** Only approved segments are promoted into canonical revision state; unapproved segments remain pending review.
- **D-08:** Even for full-draft intake, review stays chunk-oriented rather than forcing all-at-once approval.
- **D-09:** The baseline API flow is `submit -> extract -> review -> approve -> check`.
- **D-10:** Consistency checks run only when the user explicitly requests them.
- **D-11:** The external workflow uses an explicit state machine with states such as `submitted`, `extracted`, `needs_review`, `partially_approved`, `approved`, and `checked`.
- **D-12:** Review and check remain separate API responsibilities; extraction completion does not imply automatic checking.
- **D-13:** Ambiguous interpretation outputs remain visible as structured candidates with fields such as `confidence`, `provenance`, and `review_needed`.
- **D-14:** Every structured item carries source-text span or segment-level provenance, not only submission-level provenance.
- **D-15:** The system preserves both the original extracted value and the user-corrected value for auditability.
- **D-16:** `review_needed` is assigned automatically when confidence is low or multiple candidate interpretations conflict.
- **D-17:** Extraction is LLM-assisted, but progression depends on deterministic schema validation and canonical normalization.
- **D-18:** If an LLM output parses but cannot be normalized cleanly, it moves to `review_needed` rather than being auto-fixed or silently promoted.
- **D-19:** Phase 5 starts with a single model and a single prompt family; multi-model or multi-pass extraction is deferred.
- **D-20:** The extraction layer is advisory only and never bypasses the logic-led canonical model.

### Claude's Discretion
- Exact segmentation heuristics for auto-splitting full drafts, as long as segment boundaries remain review-editable.
- Exact review payload and patch format, as long as structured field editing and segment-level approval remain intact.
- Exact persistence model for in-progress review state, as long as canonical promotion stays approval-gated and auditable.
- Exact confidence threshold policy that turns candidates into `review_needed`.
- Exact API route naming and transport surface, as long as the chosen state machine and manual check trigger are preserved.

### Deferred Ideas (OUT OF SCOPE)
- Automatic checks on approval or on submission — deferred because Phase 5 keeps checks manual and user-triggered.
- Free-text annotation driven correction loops — deferred in favor of structured field editing.
- Multi-model or multi-pass extraction pipelines — deferred until the single-model contract stabilizes.
- Marking every extracted item as review-required by default — deferred because rule-based `review_needed` was chosen instead.
- Whole-draft all-at-once approval/finalization flows — deferred because segment-level approval was chosen.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FLOW-01 | User can submit natural-language synopsis or scene text and receive a normalized structured interpretation for review. `[VERIFIED: .planning/REQUIREMENTS.md]` | Fastify submission routes, schema-constrained extraction output, review-session persistence, provenance-preserving candidate model, and approval-gated normalization support this requirement. `[VERIFIED: package.json][VERIFIED: src/storage/repositories/story-repository.ts][CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/][CITED: https://developers.openai.com/api/docs/guides/structured-outputs]` |
| FLOW-03 | User can run consistency checks on demand and is not forced into realtime verdicting while drafting. `[VERIFIED: .planning/REQUIREMENTS.md]` | A separate `check` endpoint that resolves the latest approved revision and calls `executeVerdictRun` preserves the manual-only check boundary. `[VERIFIED: src/services/verdict-runner.ts][VERIFIED: .planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md]` |
</phase_requirements>

<research_summary>
## Summary

Phase 5 does not need a second application core. The repo already has the right lower layers: canonical persistence is revision-scoped, verdict runs are auditable, and the manual check entrypoint already exists in `executeVerdictRun`. `[VERIFIED: src/storage/repositories/story-repository.ts][VERIFIED: src/storage/repositories/verdict-run-repository.ts][VERIFIED: src/services/verdict-runner.ts]` The missing pieces are an HTTP transport, an extraction boundary, and a review-state model that can hold unapproved structure without contaminating canonical revisions. `[VERIFIED: package.json][VERIFIED: .planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md]`

The cleanest plan is a four-layer flow: `submission API -> deterministic segmentation -> schema-constrained extraction -> review-session overlay -> approval-driven canonical promotion -> manual check`. `[VERIFIED: .planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md][ASSUMED]` Fastify fits the first API surface because current project guidance already recommends it, and official Fastify docs confirm route schemas, plugin encapsulation, and built-in test injection. `[VERIFIED: AGENTS.md][CITED: https://fastify.dev/docs/latest/Reference/Routes/][CITED: https://fastify.dev/docs/latest/Reference/Plugins/][CITED: https://fastify.dev/docs/latest/Guides/Testing/]` Zod should remain the single schema source of truth because the repo already uses it broadly and Zod 4 can emit JSON Schema for route validation. `[VERIFIED: package.json][CITED: https://zod.dev/json-schema]`

The strongest codebase-specific planning constraint is that canonical repositories are snapshot-oriented, not patch-oriented. `StoryRepository.saveGraph()` upserts by canonical IDs and the repository has no delete path, so Phase 5 should not let partial segment approvals mutate an existing revision in place. `[VERIFIED: src/storage/repositories/story-repository.ts][VERIFIED: rg -n "DELETE FROM" src/storage/repositories/story-repository.ts src/storage/repositories]` Instead, approvals should materialize a new child revision with `basedOnRevisionId` pointing to the previously approved revision, while unapproved segments remain in review tables only. `[VERIFIED: src/domain/entities.ts][ASSUMED]`

**Primary recommendation:** Add Phase 5 as a thin Fastify API plus a separate review-session persistence layer; keep model output schema-constrained and non-canonical, promote only approved segments into new `normalized` child revisions, and wire `check` directly to `executeVerdictRun({ triggerKind: "manual" })`. `[VERIFIED: AGENTS.md][VERIFIED: src/services/verdict-runner.ts][CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/][CITED: https://developers.openai.com/api/docs/guides/structured-outputs][ASSUMED]`
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Fastify | `5.8.4` `[VERIFIED: npm registry, modified 2026-03-23]` | First HTTP API surface for submission, review, approval, and check endpoints. `[VERIFIED: package.json lacks any HTTP framework]` | Project guidance already recommends Fastify, and official docs confirm schema-based request/response handling plus plugin encapsulation for route modules. `[VERIFIED: AGENTS.md][CITED: https://fastify.dev/docs/latest/Reference/Routes/][CITED: https://fastify.dev/docs/latest/Reference/Plugins/][CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/]` |
| fastify-plugin | `5.1.0` `[VERIFIED: npm registry, modified 2025-09-28]` | Shared decorations for repositories, extraction client, and session services. `[ASSUMED]` | Fastify docs explicitly recommend `fastify-plugin` when shared decorators must escape plugin scope. `[CITED: https://fastify.dev/docs/latest/Reference/Plugins/]` |
| Zod | `4.1.12` installed / `4.3.6` latest `[VERIFIED: package.json][VERIFIED: npm registry, modified 2026-01-25]` | Single schema source for request DTOs, extraction contracts, review items, and canonical normalization inputs. `[VERIFIED: package.json]` | The repo already relies on Zod, and Zod 4 exposes `z.toJSONSchema()` so route schemas and internal types do not diverge. `[VERIFIED: package.json][CITED: https://zod.dev/json-schema]` |
| OpenAI Node SDK | `6.34.0` `[VERIFIED: npm registry, modified 2026-04-08]` | Default single-model extraction adapter for Phase 5. `[ASSUMED]` | Official docs show Responses API structured outputs with Zod helpers and refusal handling, which matches segment extraction better than prompt-only JSON mode. `[CITED: https://developers.openai.com/api/docs/guides/structured-outputs]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Existing repository layer (`StoryRepository`, `RuleRepository`, `VerdictRepository`, `VerdictRunRepository`) | current repo `[VERIFIED: src/storage/repositories/*.ts]` | Canonical promotion and check integration. `[VERIFIED: src/services/verdict-runner.ts]` | Use for all canonical writes and manual check orchestration; do not bypass them from route handlers. `[VERIFIED: src/services/verdict-runner.ts][VERIFIED: src/storage/repositories/story-repository.ts]` |
| ProvenanceRepository | current repo `[VERIFIED: src/storage/repositories/provenance-repository.ts]` | Canonical provenance persistence after approval. `[VERIFIED: src/storage/repositories/provenance-repository.ts]` | Use when approved items become canonical entities/events/rules; keep review-layer spans in separate review tables until then. `[VERIFIED: src/storage/repositories/provenance-repository.ts][ASSUMED]` |
| pg-mem | `3.0.5` installed / `3.0.14` latest `[VERIFIED: package.json][VERIFIED: npm registry, modified 2026-02-26]` | Fast integration tests for API routes, session repos, and promotion/check flows. `[VERIFIED: tests/engine/verdict-runner.test.ts]` | Use for route and repository tests so Phase 5 validation stays local and deterministic. `[VERIFIED: tests/engine/verdict-runner.test.ts][CITED: https://fastify.dev/docs/latest/Guides/Testing/]` |
| Vitest | `3.2.4` installed / `4.1.4` latest `[VERIFIED: package.json][VERIFIED: npm registry, modified 2026-04-09]` | Existing test harness. `[VERIFIED: package.json]` | Keep the current harness for Phase 5 unless a separate dependency-refresh task is budgeted. `[VERIFIED: package.json][VERIFIED: vitest.config.ts][ASSUMED]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Fastify route schemas generated from Zod | Handwritten JSON Schema alongside Zod types | Faster to spike once, but official OpenAI docs warn against schema/type divergence and Zod already supports JSON Schema emission. `[CITED: https://developers.openai.com/api/docs/guides/structured-outputs][CITED: https://zod.dev/json-schema]` |
| `responses.parse()` with structured `text.format` | Function calling | OpenAI docs say function calling is for model-to-tool bridging, while structured response format is the better fit when the model should return typed data to the app. `[CITED: https://developers.openai.com/api/docs/guides/structured-outputs]` |
| Approval creating a new normalized child revision | Mutating the current revision in place | Child revisions cost extra rows, but in-place mutation conflicts with the repo’s snapshot model and weakens auditability. `[VERIFIED: src/domain/entities.ts][VERIFIED: src/storage/repositories/story-repository.ts][ASSUMED]` |

**Installation:**
```bash
npm install fastify fastify-plugin openai
```

**Version verification:**
- `fastify@5.8.4` latest on npm, registry modified `2026-03-23`. `[VERIFIED: npm registry]`
- `fastify-plugin@5.1.0` latest on npm, registry modified `2025-09-28`. `[VERIFIED: npm registry]`
- `openai@6.34.0` latest on npm, registry modified `2026-04-08`. `[VERIFIED: npm registry]`
- `zod@4.3.6` latest on npm, but repo currently pins `4.1.12`; Phase 5 can stay on the repo pin unless upgrade work is explicitly planned. `[VERIFIED: npm registry][VERIFIED: package.json]`
- `pg-mem@3.0.14` latest on npm, but repo currently pins `3.0.5`; current tests already pass on the installed version. `[VERIFIED: npm registry][VERIFIED: package.json][VERIFIED: npm run test:reasoning]`
- `vitest@4.1.4` latest on npm, but repo currently pins `3.2.4`; keep current unless dependency churn is budgeted. `[VERIFIED: npm registry][VERIFIED: package.json]`
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```text
src/
├── api/
│   ├── build-app.ts           # build Fastify instance without listening
│   ├── server.ts              # process entrypoint / listen
│   ├── plugins/
│   │   ├── repositories.ts    # decorate app with repo dependencies
│   │   └── extraction.ts      # decorate app with extraction adapter
│   └── routes/
│       ├── review-sessions.ts # submit/get session/check session
│       └── segments.ts        # edit boundaries, patch fields, approve segment
├── ingestion/
│   ├── schemas.ts             # submission, segment, candidate, review patch schemas
│   ├── segmentation.ts        # deterministic draft-to-segment splitter
│   ├── extractor.ts           # LLM adapter boundary
│   ├── normalization.ts       # review candidate -> canonical patch
│   └── promotion.ts           # canonical revision + rule pack promotion
├── services/
│   ├── review-session-service.ts
│   ├── segment-approval-service.ts
│   └── verdict-runner.ts
└── storage/
    └── repositories/
        ├── review-session-repository.ts
        ├── story-repository.ts
        ├── rule-repository.ts
        ├── provenance-repository.ts
        ├── verdict-repository.ts
        └── verdict-run-repository.ts
```
This keeps the new transport layer thin and aligned with the repo’s existing `services/` plus `storage/repositories/` split. `[VERIFIED: src/services/index.ts][VERIFIED: src/storage/repositories/story-repository.ts][CITED: https://fastify.dev/docs/latest/Guides/Testing/][ASSUMED]`

### Pattern 1: Build-App / Server Split
**What:** Create a Fastify app factory that registers plugins and routes, then keep the actual `listen()` call in a separate file. `[CITED: https://fastify.dev/docs/latest/Guides/Testing/]`
**When to use:** For the first API surface and for every route integration test. `[CITED: https://fastify.dev/docs/latest/Guides/Testing/]`
**Example:**
```typescript
import Fastify from "fastify";

export function buildApp(deps: ApiDeps) {
  const app = Fastify();
  app.register(repositoriesPlugin, deps);
  app.register(reviewSessionRoutes, { prefix: "/review-sessions" });
  return app;
}
```
Source: Fastify testing and plugin guidance. `[CITED: https://fastify.dev/docs/latest/Guides/Testing/][CITED: https://fastify.dev/docs/latest/Reference/Plugins/]`

### Pattern 2: JSON-Enveloped Submission Route
**What:** Accept submissions as JSON objects with prose text plus target metadata instead of raw `text/plain` bodies. `[ASSUMED]`
**When to use:** `POST /review-sessions` and any route that also needs `storyId`, `revisionId`, segmentation options, or submission kind. `[VERIFIED: .planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md][ASSUMED]`
**Why:** Fastify validates JSON bodies directly, while per-content-type validation requires a complete `content` map and has sharp edges if parsers accept more content types than the schema covers. `[CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/]`
**Example:**
```typescript
const SubmitSessionRequest = z.object({
  submissionKind: z.enum(["chunk", "full_draft"]),
  text: z.string().min(1),
  storyId: z.string().optional(),
  revisionId: z.string().optional(),
  title: z.string().optional()
});

app.post("/review-sessions", {
  schema: { body: z.toJSONSchema(SubmitSessionRequest) }
}, handler);
```
Source: Fastify route schema support plus Zod JSON Schema emission. `[CITED: https://fastify.dev/docs/latest/Reference/Routes/][CITED: https://zod.dev/json-schema]`

### Pattern 3: Segment-Scoped Extraction Pipeline
**What:** Run deterministic segmentation first, then invoke one model call per segment, parse into a typed extraction contract, and run canonical normalization before the session leaves extraction. `[VERIFIED: .planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md][ASSUMED]`
**When to use:** On first submission and after boundary edits that materially change segment text. `[VERIFIED: .planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md][ASSUMED]`
**Why:** Phase 5 locks chunk-oriented review and editable boundaries, so extraction needs to be segment-scoped rather than whole-draft canonicalization. `[VERIFIED: .planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md]`
**Example:**
```typescript
const response = await openai.responses.parse({
  model: configuredModel,
  input: buildSegmentPrompt(segment),
  text: { format: zodTextFormat(ExtractionContract, "segment_extraction") }
});

const parsed = readParsedMessage(response);
const normalized = normalizeExtraction(parsed);
```
Source: OpenAI structured outputs guide and repo normalization boundary requirement. `[CITED: https://developers.openai.com/api/docs/guides/structured-outputs][VERIFIED: .planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md]`

### Pattern 4: Review Overlay, Then Canonical Promotion
**What:** Store extracted and corrected review items in dedicated review tables, then translate approved segment data into a full canonical patch and persist a new child revision. `[ASSUMED]`
**When to use:** On every segment approval. `[VERIFIED: .planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md]`
**Why:** The current `StoryRepository` is revision-scoped, upsert-based, and has no delete semantics, so partial same-revision writes can leave stale rows or blur audit history. `[VERIFIED: src/storage/repositories/story-repository.ts][VERIFIED: rg -n "DELETE FROM" src/storage/repositories/story-repository.ts src/storage/repositories]`
**Example:**
```typescript
const base = await storyRepository.loadGraph(storyId, currentApprovedRevisionId);
const nextGraph = applyApprovedSegment(base, approvedSegmentPatch, newRevisionId);
await storyRepository.saveGraph(nextGraph);
```
Source: current story repository contract. `[VERIFIED: src/storage/repositories/story-repository.ts]`

### Pattern 5: Dual Promotion Path for Story Graph + Rule Packs
**What:** Promote approved entities/events/state boundaries through `StoryRepository`, and promote approved rule assumptions through `RuleRepository`. `[VERIFIED: src/storage/repositories/story-repository.ts][VERIFIED: src/storage/repositories/rule-repository.ts]`
**When to use:** Any approved segment that contains world-rule assumptions or explicit rule declarations. `[VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md]`
**Why:** `executeVerdictRun()` loads rules via `RuleRepository.listRuleVersionsForRevision()`, so approved rule assumptions must enter the canonical rule store before manual checks can see them. `[VERIFIED: src/services/verdict-runner.ts][VERIFIED: src/storage/repositories/rule-repository.ts]`
**Example:**
```typescript
await ruleRepository.saveRulePack(
  {
    ...approvedRule.metadata,
    revisionId: newRevisionId,
    sourceKind: "normalized",
    active: true
  },
  {
    ...approvedRule.version,
    validationStatus: "validated"
  }
);
```
Source: current rule repository contracts; `validationStatus: "validated"` for human-approved rules is the recommended Phase 5 mapping. `[VERIFIED: src/storage/repositories/rule-repository.ts][VERIFIED: src/domain/rules.ts][ASSUMED]`

### Pattern 6: Manual Check Route as a Thin Adapter
**What:** Expose a `check` route that resolves the latest approved revision for the session and calls `executeVerdictRun()` with `triggerKind: "manual"`. `[VERIFIED: src/services/verdict-runner.ts][ASSUMED]`
**When to use:** `POST /review-sessions/:sessionId/check`. `[ASSUMED]`
**Example:**
```typescript
const result = await executeVerdictRun({
  storyId,
  revisionId: latestApprovedRevisionId,
  storyRepository,
  ruleRepository,
  verdictRepository,
  verdictRunRepository,
  triggerKind: "manual"
});
```
Source: current verdict runner API. `[VERIFIED: src/services/verdict-runner.ts]`

### Anti-Patterns to Avoid
- **Direct model-to-canonical writes:** The extraction layer is explicitly advisory only and canonical promotion is approval-gated. `[VERIFIED: .planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md]`
- **Reusing model-generated canonical IDs:** Canonical repositories upsert by IDs, so untrusted IDs can overwrite or collide with real records. `[VERIFIED: src/storage/repositories/story-repository.ts][VERIFIED: src/storage/repositories/rule-repository.ts]`
- **Storing the whole review session as one opaque blob:** Phase 5 needs per-segment approval, per-item provenance, and original-vs-corrected audit trails, which are awkward to query if everything lives in one document. `[VERIFIED: .planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md][CITED: https://www.postgresql.org/docs/18/functions-json.html][ASSUMED]`
- **Doing database lookups during schema validation:** Fastify docs explicitly say async validation work should move to hooks such as `preHandler` after initial schema validation. `[CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/]`
- **Auto-running checks on extraction or approval:** Manual-only check triggering is a locked decision for this phase. `[VERIFIED: .planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md]`
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP routing and validation | Custom `node:http` router plus manual body parsing | Fastify routes/plugins with JSON Schema | Fastify already gives route schemas, plugin encapsulation, and test injection. `[CITED: https://fastify.dev/docs/latest/Reference/Routes/][CITED: https://fastify.dev/docs/latest/Reference/Plugins/][CITED: https://fastify.dev/docs/latest/Guides/Testing/]` |
| Model JSON discipline | Prompt-only “return JSON” plus retries/regex cleanup | Structured Outputs with Zod and deterministic normalization | OpenAI docs recommend Structured Outputs over JSON mode when schema adherence matters, and the SDK supports Zod helpers plus refusal handling. `[CITED: https://developers.openai.com/api/docs/guides/structured-outputs]` |
| Route JSON Schema duplication | Handwritten JSON Schema copies beside Zod types | `z.toJSONSchema()` from the Zod source schema | Reduces schema drift across routes, model contracts, and internal DTOs. `[CITED: https://zod.dev/json-schema][CITED: https://developers.openai.com/api/docs/guides/structured-outputs]` |
| Manual review-to-check orchestration | New route-local verdict logic | `executeVerdictRun()` | Run history, `triggerKind`, and verdict persistence already exist. `[VERIFIED: src/services/verdict-runner.ts]` |
| Partial canonical mutation | Writing segment fragments directly into the current revision | Load base graph, apply approved patch, persist a new revision snapshot | Current story persistence is snapshot/upsert oriented and not patch/delete safe. `[VERIFIED: src/storage/repositories/story-repository.ts][VERIFIED: rg -n "DELETE FROM" src/storage/repositories/story-repository.ts src/storage/repositories][ASSUMED]` |
| Route integration tests | Spinning up sockets first | `fastify.inject()` plus pg-mem | Fastify docs recommend injection and current repo already proves pg-mem-based service tests work. `[CITED: https://fastify.dev/docs/latest/Guides/Testing/][VERIFIED: tests/engine/verdict-runner.test.ts]` |

**Key insight:** Phase 5 should hand-roll the review-state domain and approval logic, but it should not hand-roll transport, JSON schema duplication, or verdict execution plumbing that the repo and selected libraries already solve. `[VERIFIED: src/services/verdict-runner.ts][VERIFIED: package.json][ASSUMED]`
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Canonical ID Pollution From Extraction Output
**What goes wrong:** The model invents IDs or reuses existing IDs, and approval overwrites unrelated entities/events/rules. `[VERIFIED: src/storage/repositories/story-repository.ts][VERIFIED: src/storage/repositories/rule-repository.ts]`
**Why it happens:** Canonical repositories use ID-keyed upserts, and Phase 5 is the first layer where untrusted model output reaches those boundaries. `[VERIFIED: src/storage/repositories/story-repository.ts][VERIFIED: src/storage/repositories/rule-repository.ts]`
**How to avoid:** Treat model identifiers as ephemeral review-local IDs only; generate or resolve canonical IDs server-side during normalization/promotion. `[ASSUMED]`
**Warning signs:** Approved segments unexpectedly replace earlier records, or two different extracted items collapse into one canonical row. `[ASSUMED]`

### Pitfall 2: Review-State Leakage Into Canonical Revisions
**What goes wrong:** Unapproved or partially corrected structure becomes visible to verdict runs. `[VERIFIED: .planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md]`
**Why it happens:** The API writes extraction output directly into canonical tables or allows `check` on a review overlay instead of a promoted revision. `[ASSUMED]`
**How to avoid:** Keep review tables separate from canonical tables and make `check` resolve only the latest approved revision. `[ASSUMED][VERIFIED: src/services/verdict-runner.ts]`
**Warning signs:** A session in `needs_review` can still produce verdicts over unapproved entities or rules. `[ASSUMED]`

### Pitfall 3: Content-Type Validation Gaps
**What goes wrong:** Route validation does not run for a parsed body, or it is bypassed by a crafted `Content-Type` header. `[CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/][CITED: https://github.com/fastify/fastify/security/advisories/GHSA-jx2c-rxcm-jvmq]`
**Why it happens:** Fastify validates only `application/json` by default unless `content` is fully enumerated, and Fastify versions `< 5.7.2` had a published validation-bypass advisory around `Content-Type` handling. `[CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/][CITED: https://github.com/fastify/fastify/security/advisories/GHSA-jx2c-rxcm-jvmq]`
**How to avoid:** Pin Fastify to `>= 5.7.2` and prefer a JSON request envelope unless every accepted content type is explicitly mapped. `[VERIFIED: npm registry][CITED: https://github.com/fastify/fastify/security/advisories/GHSA-jx2c-rxcm-jvmq][CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/]`
**Warning signs:** Requests with nonstandard `Content-Type` values are parsed successfully but never hit the intended body schema. `[CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/]`

### Pitfall 4: Schema Drift Between Route DTOs, Model Contracts, and Canonical Normalizers
**What goes wrong:** The route accepts one shape, the model emits another, and normalization expects a third. `[ASSUMED]`
**Why it happens:** Teams duplicate JSON Schema, TypeScript types, and prompt contracts by hand. `[ASSUMED]`
**How to avoid:** Keep Zod as the source schema and derive JSON Schema plus extraction contracts from it. `[CITED: https://zod.dev/json-schema][CITED: https://developers.openai.com/api/docs/guides/structured-outputs]`
**Warning signs:** Route tests pass, but extraction parse or normalization fails on the same payload family. `[ASSUMED]`

### Pitfall 5: Approved Rule Assumptions Saved With the Wrong Canonical Semantics
**What goes wrong:** Unapproved or draft rule assumptions influence verdict runs, or approved ones never become active. `[VERIFIED: src/storage/repositories/rule-repository.ts][VERIFIED: src/services/verdict-runner.ts]`
**Why it happens:** `executeVerdictRun()` loads rule versions for the revision from `RuleRepository`, and the current repository query does not filter out `draft` rule versions. `[VERIFIED: src/services/verdict-runner.ts][VERIFIED: src/storage/repositories/rule-repository.ts]`
**How to avoid:** Keep extracted rule assumptions in review state until approval, and on approval save them intentionally with `sourceKind: "normalized"` and a human-approved validation state. `[VERIFIED: src/domain/rules.ts][ASSUMED]`
**Warning signs:** A rule assumption begins affecting checks before the segment is approved, or approved rule changes never appear in active-rule resolution. `[VERIFIED: src/engine/rule-activation.ts][ASSUMED]`

### Pitfall 6: Async Work Inside Validation
**What goes wrong:** Validation becomes a hidden database or network bottleneck and can turn malformed input into a denial-of-service amplifier. `[CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/]`
**Why it happens:** Developers attempt entity existence checks, story lookup, or revision lookup inside schema validation. `[ASSUMED]`
**How to avoid:** Keep route validation purely structural, then do story/revision existence, stale-session checks, and authorization-like checks in `preHandler` or service code. `[CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/][ASSUMED]`
**Warning signs:** Simple malformed requests cause database traffic or model calls before a 4xx response is returned. `[ASSUMED]`
</common_pitfalls>

<code_examples>
## Code Examples

Verified patterns from official sources and the live repo:

### Fastify Route With JSON-Schema Body Validation
```typescript
const SubmitSessionRequest = z.object({
  submissionKind: z.enum(["chunk", "full_draft"]),
  text: z.string().min(1),
  storyId: z.string().optional(),
  revisionId: z.string().optional()
});

app.post("/review-sessions", {
  schema: {
    body: z.toJSONSchema(SubmitSessionRequest)
  }
}, async (request, reply) => {
  return reply.code(202).send(await reviewSessionService.submit(request.body));
});
```
Source: Fastify route schema support + Zod JSON Schema conversion. `[CITED: https://fastify.dev/docs/latest/Reference/Routes/][CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/][CITED: https://zod.dev/json-schema]`

### Structured Extraction With Zod-Constrained Output
```typescript
const response = await openai.responses.parse({
  model: configuredModel,
  input: buildSegmentPrompt(segmentText),
  text: {
    format: zodTextFormat(ExtractionContract, "segment_extraction")
  }
});

const parsed = readParsedMessage(response);
```
Source: OpenAI Structured Outputs guide for Responses API + Zod helper usage. `[CITED: https://developers.openai.com/api/docs/guides/structured-outputs]`

### Manual Check Integration Through Existing Verdict Runner
```typescript
const result = await executeVerdictRun({
  storyId,
  revisionId,
  storyRepository,
  ruleRepository,
  verdictRepository,
  verdictRunRepository,
  triggerKind: "manual"
});
```
Source: current repo service boundary. `[VERIFIED: src/services/verdict-runner.ts]`

### Fastify Route Testing Without Opening a Socket
```typescript
const app = buildApp(testDeps);
const response = await app.inject({
  method: "POST",
  url: "/review-sessions",
  payload: requestBody
});
```
Source: Fastify testing guide and current repo’s pg-mem test style. `[CITED: https://fastify.dev/docs/latest/Guides/Testing/][VERIFIED: tests/engine/verdict-runner.test.ts]`
</code_examples>

<state_of_the_art>
## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prompt-only “return JSON” plus retries | Structured Outputs with schema adherence and explicit refusal handling. `[CITED: https://developers.openai.com/api/docs/guides/structured-outputs]` | Current OpenAI docs; Structured Outputs are documented for current model families and recommended over JSON mode when possible. `[CITED: https://developers.openai.com/api/docs/guides/structured-outputs]` | Better extraction contract stability for Phase 5. `[CITED: https://developers.openai.com/api/docs/guides/structured-outputs]` |
| Separate handwritten JSON Schema beside runtime types | Zod 4 emitting JSON Schema from the runtime schema. `[CITED: https://zod.dev/json-schema]` | Zod 4 became stable on npm in `2025-07-09`, and the current docs expose `z.toJSONSchema()`. `[VERIFIED: npm registry][CITED: https://zod.dev/json-schema]` | One schema source across routes, extraction DTOs, and normalization inputs. `[CITED: https://zod.dev/json-schema][ASSUMED]` |
| Trusting content-type-discriminated validation without extra care | Fastify `>= 5.7.2` plus explicit content maps or a JSON envelope. `[CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/][CITED: https://github.com/fastify/fastify/security/advisories/GHSA-jx2c-rxcm-jvmq]` | Fastify advisory GHSA-jx2c-rxcm-jvmq published `2026-02-02`; patched in `5.7.2`. `[CITED: https://github.com/fastify/fastify/security/advisories/GHSA-jx2c-rxcm-jvmq]` | First API surface should pin a patched Fastify and keep request validation simple. `[VERIFIED: npm registry][ASSUMED]` |

**Deprecated/outdated:**
- JSON mode as the primary extraction contract for this phase is outdated when Structured Outputs are available, because JSON mode does not guarantee schema adherence. `[CITED: https://developers.openai.com/api/docs/guides/structured-outputs]`
- Writing review data directly into the current canonical revision is outdated for this repo shape, because the repository layer is already revision-oriented and run-audited. `[VERIFIED: src/domain/entities.ts][VERIFIED: src/services/verdict-runner.ts][ASSUMED]`
</state_of_the_art>

<assumptions_log>
## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Review state should live in dedicated `review_sessions`, `review_segments`, and `review_items` tables instead of a single session blob. | Architecture Patterns | Planner may choose a different persistence split and need to rework repository/task boundaries. |
| A2 | Each approved segment should create a new child canonical revision rather than mutating the current revision in place. | Summary, Architecture Patterns | If the project prefers in-place mutation, promotion and check flows will need different audit guarantees. |
| A3 | OpenAI Responses API should be the initial single-model extraction adapter for Phase 5. | Standard Stack | If another provider is chosen, only the adapter layer and package install change, but route/review/promotion design should stay similar. |
| A4 | Human-approved extracted rule assumptions should be persisted with a validation state equivalent to “validated”. | Architecture Patterns, Common Pitfalls | If current rule validation semantics differ, approved rules may accidentally remain inactive or draft-only. |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.
</assumptions_log>

<open_questions>
## Open Questions

1. **How should a brand-new draft session satisfy the existing story metadata contract?**
   - What we know: `StoryRecordSchema` requires `title` and `defaultRulePackName`, and `StoryRevisionRecordSchema` requires `storyId`, `revisionId`, `sourceKind`, and `createdAt`. `[VERIFIED: src/domain/entities.ts]`
   - What's unclear: A greenfield submission may start from prose only, with no story metadata yet. `[VERIFIED: .planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md]`
   - Recommendation: Decide in Plan 05-01 whether submission must include minimal draft metadata up front or whether the API creates placeholder story metadata until first approval. `[ASSUMED]`

2. **How should stale review sessions behave when the target revision changes after submission?**
   - What we know: The phase supports attaching intake to an existing `storyId/revisionId`, and canonical revisions already track lineage through `basedOnRevisionId`. `[VERIFIED: .planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md][VERIFIED: src/domain/entities.ts]`
   - What's unclear: The repo has no current merge/rebase model for concurrent review sessions or approvals against a moved target. `[VERIFIED: codebase grep][ASSUMED]`
   - Recommendation: Start Phase 5 with single-writer semantics per target revision and mark stale sessions as requiring re-extraction/rebase once the approved revision chain advances. `[ASSUMED]`
</open_questions>

<environment_availability>
## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | API server/runtime | ✓ `[VERIFIED: local command]` | `25.9.0` `[VERIFIED: local command]` | Project guidance still targets Node 24 LTS, so CI should pin the project baseline even though this machine is newer. `[VERIFIED: AGENTS.md][ASSUMED]` |
| npm | Package install and scripts | ✓ `[VERIFIED: local command]` | `11.12.1` `[VERIFIED: local command]` | — |
| PostgreSQL CLI/service | Live API persistence outside tests | ✗ `[VERIFIED: local command]` | `—` | `pg-mem` covers automated tests only; there is no live DB fallback for manual E2E API runs. `[VERIFIED: package.json][VERIFIED: tests/engine/verdict-runner.test.ts]` |
| `OPENAI_API_KEY` | Live extraction calls | ✗ `[VERIFIED: local command]` | `—` | Use a mock extraction adapter in automated tests; live extraction remains blocked without credentials. `[VERIFIED: local command][ASSUMED]` |
| `fastify` package | First API surface | ✗ in repo `[VERIFIED: package.json]` | `—` | Install `fastify@5.8.4`. `[VERIFIED: npm registry]` |
| `openai` package | Default extraction adapter | ✗ in repo `[VERIFIED: package.json]` | `—` | Install `openai@6.34.0`, or swap in another provider behind the same adapter interface if the user changes provider. `[VERIFIED: npm registry][ASSUMED]` |

**Missing dependencies with no fallback:**
- Live extraction credentials are absent, so real model-backed extraction cannot be exercised on this machine yet. `[VERIFIED: local command]`
- A live PostgreSQL runtime is absent, so manual end-to-end API verification against a real DB is not available yet. `[VERIFIED: local command]`

**Missing dependencies with fallback:**
- `fastify` and `openai` are not in `package.json` yet, but both are ordinary npm installs and do not block planning. `[VERIFIED: package.json][VERIFIED: npm registry]`
- PostgreSQL is not available locally, but pg-mem is already sufficient for route/service/repository automation during Phase 5 implementation. `[VERIFIED: package.json][VERIFIED: tests/engine/verdict-runner.test.ts]`
</environment_availability>

<validation_architecture>
## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `Vitest 3.2.4` installed, `4.1.4` latest. `[VERIFIED: package.json][VERIFIED: npm registry]` |
| Config file | `vitest.config.ts`. `[VERIFIED: vitest.config.ts]` |
| Quick run command | `npx vitest run tests/api/review-session-routes.test.ts tests/services/extraction-pipeline.test.ts tests/services/segment-approval-service.test.ts tests/api/check-route.test.ts -x` `[ASSUMED]` |
| Full suite command | `npm run test && npm run typecheck` `[VERIFIED: package.json]` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FLOW-01 | Submit prose, segment it, parse extraction output, preserve review-needed ambiguity, and expose reviewable structured candidates. `[VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: .planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md]` | integration | `npx vitest run tests/api/review-session-routes.test.ts tests/services/extraction-pipeline.test.ts tests/storage/review-session-repository.test.ts -x` `[ASSUMED]` | ❌ Wave 0 `[VERIFIED: rg --files tests]` |
| FLOW-01 | Approve a segment and promote only approved structure into a new canonical revision while preserving original-vs-corrected audit data. `[VERIFIED: .planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md]` | integration | `npx vitest run tests/services/segment-approval-service.test.ts tests/storage/review-session-repository.test.ts tests/storage/promotion-roundtrip.test.ts -x` `[ASSUMED]` | ❌ Wave 0 `[VERIFIED: rg --files tests]` |
| FLOW-03 | Run checks only on explicit request and only against the latest approved revision. `[VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: src/services/verdict-runner.ts]` | integration | `npx vitest run tests/api/check-route.test.ts tests/services/check-session-service.test.ts tests/engine/verdict-runner.test.ts -x` `[ASSUMED]` | ❌ Wave 0 for new API/service tests; ✅ existing `tests/engine/verdict-runner.test.ts`. `[VERIFIED: rg --files tests]` |

### Sampling Rate
- **Per task commit:** Run the smallest relevant Phase 5 Vitest command for the touched route/service/repository files. `[ASSUMED]`
- **Per wave merge:** Run `npm run test`. `[VERIFIED: package.json]`
- **Phase gate:** Run `npm run test && npm run typecheck` before `/gsd-verify-work`. `[VERIFIED: package.json]`

### Wave 0 Gaps
- [ ] `tests/api/review-session-routes.test.ts` — request/response validation, state transitions, and submission routing for `FLOW-01`. `[VERIFIED: rg --files tests][ASSUMED]`
- [ ] `tests/services/extraction-pipeline.test.ts` — segmentation, structured parse, normalization failure to `review_needed`, and refusal handling for `FLOW-01`. `[VERIFIED: .planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md][ASSUMED]`
- [ ] `tests/storage/review-session-repository.test.ts` — review/session persistence round-trips, provenance spans, and original-vs-corrected audit fields. `[ASSUMED]`
- [ ] `tests/services/segment-approval-service.test.ts` — promotion into new revision snapshots and rule-pack promotion behavior. `[ASSUMED]`
- [ ] `tests/api/check-route.test.ts` and `tests/services/check-session-service.test.ts` — manual-only check trigger integration with `executeVerdictRun`. `[VERIFIED: src/services/verdict-runner.ts][ASSUMED]`
- [ ] `src/api/build-app.ts` test harness entrypoint so `fastify.inject()` can exercise routes without opening sockets. `[CITED: https://fastify.dev/docs/latest/Guides/Testing/][ASSUMED]`
- [ ] Package install: `npm install fastify fastify-plugin openai`. `[VERIFIED: package.json][VERIFIED: npm registry]`
</validation_architecture>

<security_domain>
## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no `[VERIFIED: .planning/REQUIREMENTS.md]` | Authentication is not part of Phase 5 requirements or current roadmap scope. `[VERIFIED: .planning/ROADMAP.md]` |
| V3 Session Management | no `[VERIFIED: .planning/REQUIREMENTS.md]` | Review sessions are workflow records, not auth sessions, in the current scope. `[ASSUMED]` |
| V4 Access Control | yes `[ASSUMED]` | Keep the first API surface local/trusted-by-default and route all mutations through explicit `storyId/revisionId` plus approval boundaries; do not deploy this unauthenticated API broadly without a later auth phase. `[VERIFIED: .planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md][ASSUMED]` |
| V5 Input Validation | yes `[VERIFIED: .planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md]` | Fastify route schemas + Zod DTOs + deterministic normalization; model output never bypasses local validation. `[CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/][CITED: https://zod.dev/json-schema][VERIFIED: .planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md]` |
| V6 Cryptography | yes `[ASSUMED]` | No hand-rolled crypto; keep provider credentials in environment variables only and rely on provider transport/TLS rather than app-layer custom cryptography. `[VERIFIED: local command][ASSUMED]` |

### Known Threat Patterns for Phase 5
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prompt injection or adversarial prose steering extraction | Tampering | Keep the model output schema-constrained, never allow tool calling for Phase 5 extraction, and require deterministic local normalization before review/canonical promotion. `[CITED: https://developers.openai.com/api/docs/guides/structured-outputs][VERIFIED: .planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md]` |
| Content-Type validation bypass or parser/schema mismatch | Tampering | Pin Fastify `>= 5.7.2`, prefer JSON envelopes, and ensure every accepted content type has a schema entry if per-content-type validation is used. `[VERIFIED: npm registry][CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/][CITED: https://github.com/fastify/fastify/security/advisories/GHSA-jx2c-rxcm-jvmq]` |
| Canonical overwrite via untrusted IDs | Tampering | Generate or resolve canonical IDs server-side during normalization/promotion; never trust model-supplied IDs. `[VERIFIED: src/storage/repositories/story-repository.ts][VERIFIED: src/storage/repositories/rule-repository.ts][ASSUMED]` |
| Repudiation of model output vs human correction | Repudiation | Store original extracted value, corrected value, review-needed flags, and item-level provenance spans in review state; write canonical provenance records only on approval. `[VERIFIED: .planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md][VERIFIED: src/storage/repositories/provenance-repository.ts][ASSUMED]` |
| Premature rule activation | Elevation of Privilege | Keep extracted rule assumptions out of canonical rule tables until approval, then promote them intentionally with normalized source metadata. `[VERIFIED: src/storage/repositories/rule-repository.ts][VERIFIED: src/services/verdict-runner.ts][ASSUMED]` |
| Manual check against mixed approved/unapproved state | Integrity | Resolve the session’s latest approved revision and call `executeVerdictRun` only on that revision. `[VERIFIED: src/services/verdict-runner.ts][ASSUMED]` |
</security_domain>

<sources>
## Sources

### Primary (HIGH confidence)
- `AGENTS.md` — project stack guidance and workflow constraints. `[VERIFIED: local file]`
- `.planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md` — locked decisions and phase boundary. `[VERIFIED: local file]`
- `.planning/REQUIREMENTS.md` — `FLOW-01` and `FLOW-03`. `[VERIFIED: local file]`
- `.planning/ROADMAP.md` — Phase 5 goals and plan split. `[VERIFIED: local file]`
- `package.json` and `vitest.config.ts` — current dependency and validation baseline. `[VERIFIED: local files]`
- `src/services/verdict-runner.ts` — manual check integration point. `[VERIFIED: local file]`
- `src/storage/repositories/story-repository.ts` — revision-scoped canonical persistence semantics. `[VERIFIED: local file]`
- `src/storage/repositories/rule-repository.ts` and `src/domain/rules.ts` — canonical rule-promotion boundary. `[VERIFIED: local files]`
- `src/storage/repositories/provenance-repository.ts` — canonical provenance boundary. `[VERIFIED: local file]`
- `tests/engine/verdict-runner.test.ts` — existing pg-mem-backed service test pattern. `[VERIFIED: local file]`
- https://fastify.dev/docs/latest/Reference/Routes/ — route schema and request/response contract support. `[CITED]`
- https://fastify.dev/docs/latest/Reference/Plugins/ — plugin encapsulation and `fastify-plugin` recommendation. `[CITED]`
- https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/ — validation behavior, content-type handling, and async-validation guidance. `[CITED]`
- https://fastify.dev/docs/latest/Guides/Testing/ — `build app` split and `fastify.inject()` testing pattern. `[CITED]`
- https://zod.dev/json-schema — `z.toJSONSchema()` support in Zod 4. `[CITED]`
- https://developers.openai.com/api/docs/guides/structured-outputs — structured response format, refusal handling, Zod helpers, and JSON-mode tradeoffs. `[CITED]`
- https://github.com/fastify/fastify/security/advisories/GHSA-jx2c-rxcm-jvmq — Fastify content-type validation-bypass advisory and patched version floor. `[CITED]`
- https://www.postgresql.org/docs/18/functions-json.html — `jsonb` operators and mixed relational/JSON query support. `[CITED]`
- npm registry (`npm view fastify/openai/zod/vitest/pg-mem/fastify-plugin`) — current package versions and publish/modified dates. `[VERIFIED: npm registry]`
- Local environment probes (`node --version`, `npm --version`, `OPENAI_API_KEY` presence check, `npm run test:reasoning`, `npm run typecheck`) — runtime/tool availability and validation baseline. `[VERIFIED: local command]`

### Secondary (MEDIUM confidence)
- None.

### Tertiary (LOW confidence)
- None.
</sources>

<metadata>
## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — grounded in project guidance, live `package.json`, npm registry versions, and official Fastify/Zod/OpenAI docs. `[VERIFIED: AGENTS.md][VERIFIED: package.json][VERIFIED: npm registry][CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/][CITED: https://zod.dev/json-schema][CITED: https://developers.openai.com/api/docs/guides/structured-outputs]`
- Architecture: MEDIUM-HIGH — strongly constrained by current repository contracts and phase decisions, but the exact review-session table split and revision-promotion workflow still require planner confirmation. `[VERIFIED: src/storage/repositories/story-repository.ts][VERIFIED: src/storage/repositories/rule-repository.ts][VERIFIED: .planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md][ASSUMED]`
- Pitfalls: HIGH — derived from current codebase semantics plus current Fastify validation/security docs. `[VERIFIED: src/storage/repositories/story-repository.ts][VERIFIED: src/services/verdict-runner.ts][CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/][CITED: https://github.com/fastify/fastify/security/advisories/GHSA-jx2c-rxcm-jvmq]`

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 for codebase-derived findings; refresh package/doc/version checks sooner if implementation starts after that. `[ASSUMED]`
</metadata>
