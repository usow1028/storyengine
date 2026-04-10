# Phase 9: Draft Container and Segment Scope Model - Research

**Researched:** 2026-04-10
**Domain:** TypeScript/Zod draft-scale ingestion contracts, SQL persistence, API serialization, explicit check-scope modeling
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

Source: [CITED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md]

### Locked Decisions

#### Draft Hierarchy
- **D-01:** Model draft-scale input as `draft document -> draft revision -> chapter/section -> segment`. `document` and `revision` are required concepts; `chapter/section` and `segment` provide ordered navigation and traceability.
- **D-02:** A draft document is the stable writer-facing container for a longer work or chapter set. A draft revision is the versioned analysis target and should connect cleanly to existing `storyId` and `revisionId` semantics.
- **D-03:** Chapter/section metadata should be lightweight in Phase 9. It needs stable labels/order and source ranges, but not a full manuscript outline, scene graph, or format-specific structure.
- **D-04:** Keep existing canonical story entities/events/rules as the reasoning model. Draft hierarchy is source organization and provenance context, not a second narrative truth model.

#### Segment Identity and Segmentation
- **D-05:** Use deterministic segmentation first: explicit headings and blank-line blocks should create primary segments, with the existing sentence-window fallback for single-block draft text.
- **D-06:** Segment boundaries stay review-editable, carrying forward Phase 5. Phase 9 should preserve boundary patch compatibility while adding richer source context.
- **D-07:** Segment identity should not depend only on raw text content hashes. Prefer stable path/order metadata such as document, revision, chapter key, sequence, and offsets so edits do not destroy traceability.
- **D-08:** Cross-revision segment matching is not required to be solved fully in Phase 9. Phase 9 should store enough metadata for Phase 11 to compare revisions, but the diff algorithm itself belongs to Phase 11.

#### Scope Contract
- **D-09:** Define check scope as a first-class domain contract in Phase 9 even though scope execution is Phase 11.
- **D-10:** Supported initial scope forms are full approved draft, chapter/section, and contiguous segment range. Avoid arbitrary entity/rule/query scopes in Phase 9.
- **D-11:** Scope records must carry enough identity for downstream results to state what was checked: document, revision, optional chapter/section, segment range, and source offsets where available.
- **D-12:** Scope should be explicit in API/service contracts instead of inferred from whatever segments currently happen to be approved.

#### API Compatibility
- **D-13:** Preserve the existing `chunk` and `full_draft` submission modes and the current `submit -> extract -> review -> approve -> check` mental model.
- **D-14:** Add draft metadata as extensions to current request/response contracts rather than renaming existing fields in a breaking way.
- **D-15:** `draftTitle` and `rawText` can remain compatibility fields, but they must no longer be the only place draft-scale identity lives.
- **D-16:** Existing ingestion tests for session snapshots, segmentation, review patches, and API serialization should remain valid while new draft-scale fields are added.

### Claude's Discretion

- Exact TypeScript names for draft document, draft revision, chapter/section, segment path, and scope schemas.
- Whether chapter and section use one enum-backed structure or a generic hierarchy node in Phase 9, provided the first supported level is chapter/section plus segments.
- Exact ID formatting, as long as IDs are Zod-validated, deterministic where practical, and preserve backward compatibility.
- Exact migration layout, as long as it keeps pg-mem storage tests fast and queryable.
- Whether source text references are stored as inline fields or a small structured object, as long as labels, order, offsets, and text linkage are preserved.

### Deferred Ideas (OUT OF SCOPE)

- Selected-segment extraction, retry, and failure reporting - Phase 10.
- Partial approval check semantics and explicit approved-scope execution - Phase 11.
- Revision-diff calculation and cross-revision segment matching algorithms - Phase 11.
- Browser inspection grouping/filtering for large runs - Phase 12.
- Multi-user collaboration, export/format packs, realtime editor checks, autonomous rewrites, and style scoring - out of v1.1 scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DRAFT-01 | User can submit chapter-scale draft text as an ordered document, chapter, and segment set instead of a single scene blob. | Add draft document/revision/section schemas, SQL tables, and a deterministic segment planner that maps headings and blank-line blocks into ordered section/segment metadata. [CITED: .planning/REQUIREMENTS.md] [VERIFIED: src/services/ingestion-session.ts] |
| DRAFT-03 | System preserves stable segment labels, order, source offsets, and source text references from submission through inspection. | Extend `IngestionSegmentRecordSchema`, repository row parsing, and `serializeIngestionSessionResponse` so labels, sequence, offsets, section path, and source-text refs survive storage/API round trips; defer inspection grouping to Phase 12 but preserve enough metadata now. [CITED: .planning/REQUIREMENTS.md] [VERIFIED: src/domain/ingestion.ts] [VERIFIED: src/api/schemas.ts] |
</phase_requirements>

## Summary

Phase 9 should be a schema-led extension of the existing ingestion system, not a new subsystem. The current code already has Zod-validated ingestion sessions, ordered segments, source offsets, candidate provenance, review patches, SQL persistence, and API serialization; the missing layer is stable draft-scale identity and explicit scope contracts. [VERIFIED: src/domain/ingestion.ts] [VERIFIED: src/services/ingestion-session.ts] [VERIFIED: src/storage/repositories/ingestion-session-repository.ts] [VERIFIED: src/api/schemas.ts]

Use the existing TypeScript/Fastify/Zod/pg-mem/Vitest stack and add no runtime dependencies for Phase 9. The work should introduce draft document, draft revision, lightweight chapter/section, segment source-reference, and check-scope contracts, then persist and serialize them additively while keeping `chunk`, `full_draft`, `draftTitle`, `rawText`, and the current submit/extract/review/approve/check flow valid. [CITED: .planning/research/STACK.md] [CITED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md] [VERIFIED: package.json]

**Primary recommendation:** Implement a new cross-layer draft contract in `src/domain/drafts.ts`, import it into ingestion/session schemas, persist it with a `0005` migration plus repository parsing, and expose it as additive `draft` and `scope` objects in API responses while retaining every existing top-level compatibility field. [VERIFIED: src/domain/index.ts] [VERIFIED: src/storage/schema.ts] [VERIFIED: src/api/schemas.ts]

## Project Constraints (from AGENTS.md)

- StoryGraph judgments must remain explainable and traceable to explicit states, events, rules, or missing assumptions. [CITED: AGENTS.md]
- Default physics remains the baseline unless user-defined world rules extend or override it. [CITED: AGENTS.md]
- LLMs may assist extraction and interpretation, but deterministic consistency judgment must remain logic-led. [CITED: AGENTS.md]
- Natural-language input must normalize into structured internal representations. [CITED: AGENTS.md]
- For file-changing work, use the GSD workflow path unless the user explicitly bypasses it; this artifact is being written as the requested GSD research artifact. [CITED: AGENTS.md]
- No `CLAUDE.md` exists in the project root. [VERIFIED: `test -f CLAUDE.md`]
- No project skill directories were found under `.claude/skills` or `.agents/skills`. [VERIFIED: `find .claude/skills .agents/skills -maxdepth 2 -name SKILL.md`]

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9.3 installed; 6.0.2 latest registry | Compile-time contracts for draft, ingestion, scope, and repository types | Existing repo is strict TypeScript and already compiles with 5.9.3; do not upgrade during Phase 9. [VERIFIED: package.json] [VERIFIED: npm registry] [VERIFIED: npm run typecheck] |
| Zod | 4.3.6 installed/latest | Runtime validation for draft/scope/API contracts | Existing domain/API contracts use Zod schemas and inferred types; Phase 9 should follow that pattern. [VERIFIED: src/domain/ingestion.ts] [VERIFIED: src/api/schemas.ts] [VERIFIED: npm registry] |
| Fastify | 5.8.4 installed/latest | API boundary for submit/read/review/check routes | Existing ingestion routes parse request bodies through API schemas and serialize snapshots centrally. [VERIFIED: src/api/routes/ingestion-submit.ts] [VERIFIED: src/api/routes/ingestion-read.ts] [VERIFIED: npm registry] |
| pg | 8.20.0 installed/latest | PostgreSQL-compatible query API | Repositories use parameterized SQL through a small `SqlQueryable` interface. [VERIFIED: src/storage/db.ts] [VERIFIED: src/storage/repositories/ingestion-session-repository.ts] [VERIFIED: npm registry] |
| pg-mem | 3.0.14 installed/latest | Fast local SQL/storage verification | Current storage and API tests create pg-mem pools and apply SQL migrations. [VERIFIED: tests/storage/ingestion-session-repository.test.ts] [VERIFIED: tests/api/ingestion-review-api.test.ts] [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 3.2.4 installed; 4.1.4 latest registry | Unit/API/storage regression tests | Keep the repo-pinned version; targeted ingestion tests pass on 3.2.4. [VERIFIED: package.json] [VERIFIED: npm ls] [VERIFIED: npm run test:ingestion] |
| `node:crypto` | Node built-in | Optional source-text integrity hash, not identity | Use only as an integrity/debug field if needed; do not make segment identity depend only on content hash. [VERIFIED: src/services/verdict-runner.ts] [CITED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zod schemas in domain/API | Plain TypeScript interfaces | Interfaces would not validate API or storage JSON at runtime; existing code validates with Zod. [VERIFIED: src/domain/ingestion.ts] |
| SQL migration plus repository parsing | ORM or ad hoc JSON file store | Existing storage uses SQL migrations and repositories; an ORM adds scope and risk without solving Phase 9. [VERIFIED: src/storage/migrations/0003_ingestion_review.sql] [VERIFIED: src/storage/repositories/ingestion-session-repository.ts] |
| Deterministic heading/block segmentation | LLM semantic segmentation | LLM segmentation would undermine deterministic traceability before source contracts are stable. [CITED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md] |
| Additive submit/read contract | New breaking draft API | Breaking route contracts would violate Phase 9 compatibility decisions and invalidate existing ingestion tests. [CITED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md] [VERIFIED: npm run test:ingestion] |

**Installation:**

No new packages are recommended for Phase 9. Use existing install state. [VERIFIED: npm ls]

```bash
npm install
```

**Version verification:**

| Package | Installed | Latest Registry | Registry Modified | Action |
|---------|-----------|-----------------|-------------------|--------|
| zod | 4.3.6 | 4.3.6 | 2026-01-25T21:51:57.252Z | Keep. [VERIFIED: npm registry] |
| fastify | 5.8.4 | 5.8.4 | 2026-03-23T10:31:05.541Z | Keep. [VERIFIED: npm registry] |
| pg | 8.20.0 | 8.20.0 | 2026-03-04T23:48:49.532Z | Keep. [VERIFIED: npm registry] |
| pg-mem | 3.0.14 | 3.0.14 | 2026-02-26T11:33:37.382Z | Keep. [VERIFIED: npm registry] |
| vitest | 3.2.4 | 4.1.4 | 2026-04-09T07:36:53.103Z | Do not upgrade in Phase 9. [VERIFIED: npm registry] |
| typescript | 5.9.3 | 6.0.2 | 2026-04-01T07:46:54.262Z | Do not upgrade in Phase 9. [VERIFIED: npm registry] |

## Architecture Patterns

### Recommended Project Structure

```text
src/
├── domain/
│   ├── drafts.ts       # draft document/revision/section/segment source refs/check scope schemas
│   ├── ingestion.ts    # ingestion session/candidate schemas extended with draft metadata
│   └── index.ts        # export drafts before or near ingestion
├── services/
│   └── ingestion-session.ts  # deterministic draft segment planning and compatibility defaults
├── storage/
│   ├── migrations/0005_draft_scope.sql
│   └── repositories/ingestion-session-repository.ts
└── api/
    └── schemas.ts      # additive request/response draft metadata serialization
```

This structure preserves the existing domain/storage/service/API layering. [CITED: .planning/research/ARCHITECTURE.md] [VERIFIED: src/domain/index.ts] [VERIFIED: src/storage/schema.ts]

### Pattern 1: Cross-Layer Draft Domain Contract

**What:** Define draft document, draft revision, draft section, source-text reference, segment path, and check scope as Zod schemas in a new domain file. [VERIFIED: src/domain/ingestion.ts] [VERIFIED: src/domain/ids.ts]

**When to use:** Use this for any value that must cross storage, service, API, future check execution, or future inspection boundaries. [CITED: .planning/research/ARCHITECTURE.md]

**Example:**

```typescript
// Pattern source: current Zod domain schema style in src/domain/ingestion.ts and src/domain/ids.ts.
import { z } from "zod";
import { RevisionIdSchema, StoryIdSchema } from "./ids.js";

const DraftIdSchema = z.string().trim().min(1);

export const DraftDocumentIdSchema = DraftIdSchema.describe("DraftDocumentId");
export const DraftRevisionIdSchema = DraftIdSchema.describe("DraftRevisionId");
export const DraftSectionIdSchema = DraftIdSchema.describe("DraftSectionId");
export const DraftCheckScopeIdSchema = DraftIdSchema.describe("DraftCheckScopeId");

export const DraftSourceTextRefSchema = z.object({
  sourceKind: z.literal("ingestion_session_raw_text"),
  sessionId: z.string().trim().min(1),
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().nonnegative(),
  textNormalization: z.literal("lf").default("lf")
}).superRefine((value, ctx) => {
  if (value.startOffset > value.endOffset) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "startOffset cannot exceed endOffset" });
  }
});

export const DraftCheckScopeSchema = z.discriminatedUnion("scopeKind", [
  z.object({
    scopeKind: z.literal("full_approved_draft"),
    scopeId: DraftCheckScopeIdSchema,
    documentId: DraftDocumentIdSchema,
    draftRevisionId: DraftRevisionIdSchema,
    storyId: StoryIdSchema,
    revisionId: RevisionIdSchema
  }),
  z.object({
    scopeKind: z.literal("section"),
    scopeId: DraftCheckScopeIdSchema,
    documentId: DraftDocumentIdSchema,
    draftRevisionId: DraftRevisionIdSchema,
    sectionId: DraftSectionIdSchema,
    sourceTextRef: DraftSourceTextRefSchema.optional()
  }),
  z.object({
    scopeKind: z.literal("segment_range"),
    scopeId: DraftCheckScopeIdSchema,
    documentId: DraftDocumentIdSchema,
    draftRevisionId: DraftRevisionIdSchema,
    startSegmentId: z.string().trim().min(1),
    endSegmentId: z.string().trim().min(1),
    sourceTextRef: DraftSourceTextRefSchema.optional()
  })
]);
```

### Pattern 2: Additive Persistence, Not Session Replacement

**What:** Add draft tables and nullable draft metadata columns while keeping `ingestion_sessions`, `ingestion_segments`, and `ingestion_candidates` valid. [VERIFIED: src/storage/migrations/0003_ingestion_review.sql]

**When to use:** Use this for Phase 9 because existing single-chunk and full-draft rows must still load and serialize. [CITED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md]

**Example:**

```sql
-- Pattern source: CREATE TABLE IF NOT EXISTS and ADD COLUMN IF NOT EXISTS patterns in existing migrations.
CREATE TABLE IF NOT EXISTS draft_documents (
  document_id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS draft_revisions (
  draft_revision_id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES draft_documents(document_id) ON DELETE CASCADE,
  story_id TEXT NOT NULL,
  revision_id TEXT NOT NULL,
  based_on_draft_revision_id TEXT REFERENCES draft_revisions(draft_revision_id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS draft_sections (
  section_id TEXT PRIMARY KEY,
  draft_revision_id TEXT NOT NULL REFERENCES draft_revisions(draft_revision_id) ON DELETE CASCADE,
  section_kind TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  label TEXT NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL
);

ALTER TABLE ingestion_segments
ADD COLUMN IF NOT EXISTS draft_revision_id TEXT,
ADD COLUMN IF NOT EXISTS section_id TEXT,
ADD COLUMN IF NOT EXISTS source_text_ref JSONB;
```

### Pattern 3: Deterministic Segment Planner

**What:** Replace the current `segmentSubmissionText` internals with a richer planner that still returns ingestion segments but also returns document/revision/section/source-ref metadata. [VERIFIED: src/services/ingestion-session.ts]

**When to use:** Use on submit only; do not run segmentation during read/serialization because source layout must be persisted, not recomputed. [VERIFIED: src/storage/repositories/ingestion-session-repository.ts]

**Example:**

```typescript
// Pattern source: current segmentSubmissionText() API and offset-preserving block/sentence segmentation.
const plan = planDraftSubmission({
  sessionId: session.sessionId,
  submissionKind: session.inputKind,
  rawText: normalizeDraftSourceText(session.rawText),
  draftTitle: session.draftTitle,
  storyId: session.storyId,
  revisionId: session.revisionId
});

await repository.saveDraftPlan(session.sessionId, plan);
```

### Pattern 4: Scope Contract Before Scope Execution

**What:** Persist and serialize check scope values now, but keep `executeIngestionCheck` behavior unchanged until Phase 11. [VERIFIED: src/services/ingestion-check.ts] [CITED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md]

**When to use:** Use when constructing default scope records such as full approved draft, section, or contiguous segment range. [CITED: .planning/ROADMAP.md]

**Example:**

```typescript
// Pattern source: scope must be explicit and execution is deferred to Phase 11.
const fullDraftScope = DraftCheckScopeSchema.parse({
  scopeKind: "full_approved_draft",
  scopeId: `scope:${session.sessionId}:full`,
  documentId: plan.document.documentId,
  draftRevisionId: plan.revision.draftRevisionId,
  storyId: session.storyId,
  revisionId: session.revisionId
});
```

### Anti-Patterns to Avoid

- **Session-only draft identity:** `draftTitle` and `rawText` are compatibility fields, not the full draft model. [CITED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md]
- **Content-hash-only segment IDs:** hashes can support integrity checks, but segment identity must include path/order/source metadata. [CITED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md]
- **Scope inferred from approval state:** the scope record must say what was intended to be checked even before execution exists. [CITED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md]
- **Scope execution in Phase 9:** execution and approved-scope semantics are Phase 11 work. [CITED: .planning/ROADMAP.md]
- **A full manuscript ontology:** Phase 9 only needs lightweight chapter/section metadata and ordered segments. [CITED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Runtime contract validation | Custom type guards or unchecked casts | Existing Zod schemas and `z.infer` types | Current domain/API/storage parsing depends on Zod. [VERIFIED: src/domain/ingestion.ts] [VERIFIED: src/api/schemas.ts] |
| SQL persistence abstraction | ORM layer or JSON file store | Existing SQL migrations and repository classes | Existing storage tests apply migrations through pg-mem and parse rows through schemas. [VERIFIED: src/storage/schema.ts] [VERIFIED: tests/storage/ingestion-session-repository.test.ts] |
| Scope derivation | Helper that guesses from approved segments | `DraftCheckScopeSchema` and persisted scope records | User decisions require explicit scope contracts. [CITED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md] |
| Source references | Loose `{start,end}` objects scattered through responses | Shared `DraftSourceTextRefSchema` | Offset basis and source text linkage must survive storage/API round trips. [CITED: .planning/REQUIREMENTS.md] |
| Semantic segmentation | LLM or probabilistic boundary detection | Deterministic heading/block/sentence-window planner | The current phase prioritizes stable traceability over semantic segmentation. [CITED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md] |
| Dependency upgrades | Opportunistic TypeScript/Vitest major upgrades | Existing installed versions | Phase 9 can pass typecheck and ingestion tests without upgrades. [VERIFIED: npm run typecheck] [VERIFIED: npm run test:ingestion] |

**Key insight:** The hard part is not parsing prose into beautiful manuscript structure; the hard part is preserving exact, ordered, explainable source identity while the existing ingestion/review/check contracts continue to work. [CITED: .planning/research/PITFALLS.md] [VERIFIED: src/services/ingestion-session.ts]

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None in-repo: no `.db`, `.sqlite`, `.sqlite3`, or `.duckdb` files were found outside `node_modules`/`.git`; no `DATABASE_URL` or PostgreSQL env references were found. [VERIFIED: `find` + `rg`] | Code/storage migration only; no data migration is required for in-repo state. Existing external Postgres, if a user has one outside repo/env, would need normal migration application. |
| Live service config | None found: no Docker, Redis, pm2, systemd, or live database config references were found in repo source/planning files. [VERIFIED: `rg DATABASE_URL|POSTGRES|REDIS|pm2|systemd|docker`] | None for Phase 9. |
| OS-registered state | None found in repo references. [VERIFIED: `rg pm2|systemd|docker`] | None. |
| Secrets/env vars | No `.env*` files were found. [VERIFIED: `rg --files -g '.env*'`] | None. |
| Build artifacts | `dist/ui/index.html` and compiled config files exist. [VERIFIED: `find dist -maxdepth 2 -type f`] | Rebuild only when implementation changes need build verification; do not treat `dist` as source of truth. |

**Nothing found in category:** Stored data, live service config, OS-registered state, and secrets/env vars had no actionable runtime state in this checkout. [VERIFIED: local audit commands]

## Common Pitfalls

### Pitfall 1: CRLF Offset Drift
**What goes wrong:** Source offsets can point at the wrong character range when segmentation normalizes line endings but storage keeps original text. [VERIFIED: src/services/ingestion-session.ts]
**Why it happens:** Current `segmentSubmissionText` converts `\r\n` to `\n` before segmentation, while `submitIngestionSession` stores `parsed.text` as `rawText`. [VERIFIED: src/services/ingestion-session.ts]
**How to avoid:** Define offset basis explicitly in Phase 9; either store LF-normalized raw text or store `textNormalization: "lf"` in every source ref and slice from the same normalized string. [VERIFIED: src/services/ingestion-session.ts]
**Warning signs:** A CRLF fixture has correct labels but source slices fail `rawText.slice(startOffset, endOffset) === segmentText`. [VERIFIED: tests/services/natural-language-extraction.test.ts]

### Pitfall 2: Draft Tables Without Backward-Compatible Snapshot Loading
**What goes wrong:** Old rows or old API calls fail because new draft metadata is required everywhere. [CITED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md]
**Why it happens:** Existing rows only know `sessionId`, `storyId`, `revisionId`, `draftTitle`, `rawText`, and segment fields. [VERIFIED: src/storage/migrations/0003_ingestion_review.sql]
**How to avoid:** Make new columns nullable where needed, synthesize compatibility draft metadata for old snapshots, and keep top-level response fields unchanged. [VERIFIED: src/api/schemas.ts]
**Warning signs:** Existing `npm run test:ingestion` tests fail or response snapshots lose `segmentId`, `label`, `sequence`, `startOffset`, `endOffset`, or `segmentText`. [VERIFIED: npm run test:ingestion]

### Pitfall 3: Scope Contract Mixed With Check Execution
**What goes wrong:** Phase 9 accidentally changes `executeIngestionCheck` semantics or blocks approved single-chunk checks. [VERIFIED: src/services/ingestion-check.ts]
**Why it happens:** Scope is needed by later check execution, but current check service only supports full approved sessions. [VERIFIED: src/services/ingestion-check.ts]
**How to avoid:** Add schemas, persistence, serialization, and tests for scope representation only; defer approval validation and execution over scope to Phase 11. [CITED: .planning/ROADMAP.md]
**Warning signs:** Check tests start requiring scope input or partial approval starts running checks in Phase 9. [VERIFIED: tests/api/check-controls-api.test.ts]

### Pitfall 4: Section Model Becomes Manuscript Ontology
**What goes wrong:** The planner adds nested outlines, scenes, format packs, or editor concepts that are outside Phase 9. [CITED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md]
**Why it happens:** Chapter-scale input invites a richer document model than the phase needs. [CITED: .planning/research/PITFALLS.md]
**How to avoid:** Use one lightweight `DraftSection` shape with `sectionKind: "chapter" | "section"`, sequence, label, and source range. [CITED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md]
**Warning signs:** Implementation introduces screenplay/novel/export concepts or arbitrary recursive nodes. [CITED: .planning/REQUIREMENTS.md]

### Pitfall 5: Segment Boundary Review Loses Source Context
**What goes wrong:** Boundary patches update labels/offsets but leave section/source refs stale. [VERIFIED: src/storage/repositories/ingestion-session-repository.ts]
**Why it happens:** Existing boundary patches mutate only `label`, `startOffset`, and `endOffset`. [VERIFIED: src/domain/ingestion.ts] [VERIFIED: src/storage/repositories/ingestion-session-repository.ts]
**How to avoid:** Patch logic must update source-text refs from the same offsets and preserve section path metadata unless the boundary crosses sections, which should be rejected or explicitly handled. [VERIFIED: src/storage/repositories/ingestion-session-repository.ts]
**Warning signs:** Repository round-trip tests pass offsets but serialized `sourceTextRef` no longer matches. [VERIFIED: tests/storage/ingestion-session-repository.test.ts]

### Pitfall 6: Provenance Detail Stops at Segment ID
**What goes wrong:** Later inspection can trace to a candidate but cannot show document/chapter/segment path. [VERIFIED: src/services/ingestion-review.ts] [VERIFIED: src/domain/inspection.ts]
**Why it happens:** Current provenance detail stores session, segment, candidate, and candidate source span, but no draft document/revision/section metadata. [VERIFIED: src/services/ingestion-review.ts]
**How to avoid:** Add draft path/source refs to ingestion segment snapshots now and include them in created provenance details during approval. [VERIFIED: src/services/ingestion-review.ts]
**Warning signs:** Phase 12 would need to reverse-map provenance IDs back to draft structure through ad hoc joins. [CITED: .planning/research/ARCHITECTURE.md]

## Code Examples

Verified patterns from current codebase:

### Additive API Serialization

```typescript
// Source: src/api/schemas.ts centralizes snapshot serialization.
export function serializeIngestionSessionResponse(snapshotInput: unknown): IngestionSessionResponse {
  const snapshot = IngestionSessionSnapshotSchema.parse(snapshotInput);
  return IngestionSessionResponseSchema.parse({
    sessionId: snapshot.session.sessionId,
    workflowState: snapshot.session.workflowState,
    storyId: snapshot.session.storyId ?? null,
    revisionId: snapshot.session.revisionId ?? null,
    draft: snapshot.session.draft ?? null,
    scopes: snapshot.scopes ?? [],
    segments: snapshot.segments.map(({ segment, candidates }) => ({
      segmentId: segment.segmentId,
      label: segment.label,
      sequence: segment.sequence,
      startOffset: segment.startOffset,
      endOffset: segment.endOffset,
      segmentText: segment.segmentText,
      sourceTextRef: segment.sourceTextRef ?? null,
      draftPath: segment.draftPath ?? null,
      workflowState: segment.workflowState,
      approvedAt: segment.approvedAt ?? null,
      candidates
    }))
  });
}
```

### Deterministic Compatibility IDs

```typescript
// Source: current submitIngestionSession creates draft-like story/revision IDs from sessionId.
const documentId = parsed.documentId ?? `draft-document:${sessionId}`;
const draftRevisionId = parsed.draftRevisionId ?? `draft-revision:${sessionId}`;
const storyId = parsed.storyId ?? `story:draft:${sessionId}`;
const revisionId = parsed.revisionId ?? `revision:draft:${sessionId}`;
```

### Source Text Ref Round-Trip Assertion

```typescript
// Source: tests/storage/ingestion-session-repository.test.ts already verifies offsets survive storage.
const segment = snapshot.segments[0]?.segment;
expect(segment?.sourceTextRef).toMatchObject({
  sourceKind: "ingestion_session_raw_text",
  sessionId: "session:chapter-scale",
  startOffset: segment.startOffset,
  endOffset: segment.endOffset
});
expect(snapshot.session.rawText.slice(segment.startOffset, segment.endOffset)).toBe(segment.segmentText);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Treat full draft as one opaque session blob | Store draft document/revision/section/segment/source refs as explicit contracts | Phase 9 target, 2026-04-10 roadmap | Enables DRAFT-01/DRAFT-03 without changing hard verdict truth. [CITED: .planning/ROADMAP.md] |
| Infer checked range from approved segments | Persist explicit scope records | Phase 9 target, execution in Phase 11 | Prevents misleading later check/diff/inspection output. [CITED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md] |
| Segment ID derived from session order only | Segment identity includes document, draft revision, section, sequence, and source offsets | Phase 9 target | Keeps edits and later revision comparison traceable. [CITED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md] |
| LLM or semantic boundary guessing | Deterministic headings, blank-line blocks, and sentence-window fallback | Existing Phase 5 behavior retained in Phase 9 | Keeps source segmentation reproducible. [VERIFIED: src/services/ingestion-session.ts] |

**Deprecated/outdated:**
- Session-only `draftTitle`/`rawText` as draft-scale identity is insufficient for v1.1. [CITED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md]
- Content-hash-only segment identity is out of scope and conflicts with locked decisions. [CITED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md]
- Scope execution, selected extraction, retry, revision diff, and inspection grouping are not Phase 9 work. [CITED: .planning/ROADMAP.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A user may have an external PostgreSQL database outside this checkout. | Open Questions | If wrong, the additive/no-backfill recommendation is still safe; if true, planner should note that normal external migration application is required. |

## Open Questions (RESOLVED)

1. **Should old ingestion rows be physically backfilled into draft tables?**
   - What we know: No persistent in-repo database exists, and current tests create fresh pg-mem schemas. [VERIFIED: runtime state audit] [VERIFIED: tests/storage/ingestion-session-repository.test.ts]
   - What's unclear: A user may have an external PostgreSQL database outside this checkout. [ASSUMED]
   - RESOLVED: Use additive nullable schema changes with no physical backfill in Phase 9. Repository reads must synthesize compatibility draft document/revision metadata when legacy ingestion rows lack draft table records. [VERIFIED: src/storage/migrations/0003_ingestion_review.sql]

2. **Should chapter headings and section headings be separate concepts now?**
   - What we know: The context allows either an enum-backed structure or a generic hierarchy node, provided Phase 9 supports chapter/section plus segments. [CITED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md]
   - What's unclear: No product format has locked separate heading levels. [CITED: .planning/REQUIREMENTS.md]
   - RESOLVED: Use one lightweight `DraftSection` structure with `sectionKind: "chapter" | "section"`; avoid recursive hierarchy until a later format-specific phase. [CITED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | TypeScript/Vitest/tooling | ✓ | v25.8.2 | Repo target docs mention Node 24.14.0 LTS, but current local runtime passed typecheck/tests. [VERIFIED: node --version] [CITED: AGENTS.md] |
| npm | Package scripts and registry checks | ✓ | 11.12.1 | — [VERIFIED: npm --version] |
| Installed npm deps | Typecheck/tests | ✓ | See `npm ls` | Run `npm install` if missing. [VERIFIED: npm ls] |
| PostgreSQL CLI/server | External production DB migration | ✗ | — | Use pg-mem for Phase 9 tests; no local external DB is required. [VERIFIED: command -v psql] [VERIFIED: tests/storage/ingestion-session-repository.test.ts] |
| Vitest | Validation | ✓ | 3.2.4 installed | — [VERIFIED: npm ls] |
| TypeScript compiler | Typecheck | ✓ | 5.9.3 installed | — [VERIFIED: npm ls] |

**Missing dependencies with no fallback:**
- None for Phase 9 planning and local verification. [VERIFIED: npm run typecheck] [VERIFIED: npm run test:ingestion]

**Missing dependencies with fallback:**
- PostgreSQL CLI/server is not available locally; pg-mem is the established fallback for storage/API tests. [VERIFIED: command -v psql] [VERIFIED: tests/storage/ingestion-session-repository.test.ts]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 installed. [VERIFIED: npm ls] |
| Config file | `vitest.config.ts`, Node environment, `tests/**/*.test.ts` include pattern. [VERIFIED: vitest.config.ts] |
| Quick run command | `npm run test:ingestion` [VERIFIED: package.json] |
| Full suite command | `npm test` and `npm run typecheck`; browser validation is not required for Phase 9 unless API inspection contracts change. [VERIFIED: package.json] |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| DRAFT-01 | Submit chapter-scale draft as document/revision/section/segment structure | unit + API | `npm exec -- vitest run tests/services/natural-language-extraction.test.ts tests/api/ingestion-review-api.test.ts --bail=1` | ✅ extend existing files. [VERIFIED: tests/services/natural-language-extraction.test.ts] [VERIFIED: tests/api/ingestion-review-api.test.ts] |
| DRAFT-01 | Persist draft containers and revision/section metadata | storage | `npm exec -- vitest run tests/storage/ingestion-session-repository.test.ts --bail=1` | ✅ extend existing file. [VERIFIED: tests/storage/ingestion-session-repository.test.ts] |
| DRAFT-03 | Segment labels/order/offset/source refs survive repository round trip | storage | `npm exec -- vitest run tests/storage/ingestion-session-repository.test.ts --bail=1` | ✅ extend existing file. [VERIFIED: tests/storage/ingestion-session-repository.test.ts] |
| DRAFT-03 | Segment labels/order/offset/source refs survive API serialization | API | `npm exec -- vitest run tests/api/ingestion-review-api.test.ts tests/api/check-controls-api.test.ts --bail=1` | ✅ extend existing files. [VERIFIED: tests/api/ingestion-review-api.test.ts] [VERIFIED: tests/api/check-controls-api.test.ts] |
| DRAFT-03 | Check scope can be represented as domain contract | unit + storage | `npm exec -- vitest run tests/storage/ingestion-session-repository.test.ts --bail=1` | ❌ add scope-specific cases in Wave 0 or Plan 09-01. [CITED: .planning/ROADMAP.md] |
| DRAFT-03 | Existing `chunk` and `full_draft` compatibility remains valid | regression | `npm run test:ingestion` | ✅ existing suite passes before Phase 9. [VERIFIED: npm run test:ingestion] |

### Sampling Rate
- **Per task commit:** `npm run typecheck` plus the touched targeted Vitest file. [VERIFIED: package.json]
- **Per wave merge:** `npm run test:ingestion` [VERIFIED: package.json]
- **Phase gate:** `npm run typecheck && npm run test:ingestion`; run `npm test` if repository/API changes touch shared domain exports beyond ingestion. [VERIFIED: package.json]

### Wave 0 Gaps
- [ ] `tests/domain/drafts.test.ts` — validates `DraftDocument`, `DraftRevision`, `DraftSection`, `DraftSourceTextRef`, and `DraftCheckScope` schemas for DRAFT-01/DRAFT-03. [CITED: .planning/ROADMAP.md]
- [ ] Extend `tests/services/natural-language-extraction.test.ts` — CRLF offset fixture, chapter heading fixture, blank-line block fixture, sentence-window fallback fixture for DRAFT-01/DRAFT-03. [VERIFIED: src/services/ingestion-session.ts]
- [ ] Extend `tests/storage/ingestion-session-repository.test.ts` — draft tables/columns/scope records round trip through pg-mem for DRAFT-01/DRAFT-03. [VERIFIED: tests/storage/ingestion-session-repository.test.ts]
- [ ] Extend `tests/api/ingestion-review-api.test.ts` — additive submit/read response fields do not break current compatibility fields. [VERIFIED: src/api/schemas.ts]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | No auth surface is introduced in Phase 9. [VERIFIED: src/api/routes] |
| V3 Session Management | no | Ingestion session IDs exist, but user auth/session management is not implemented in this phase. [VERIFIED: src/domain/ingestion.ts] |
| V4 Access Control | no for Phase 9 | No multi-user or permission model is in v1.1 scope. [CITED: .planning/REQUIREMENTS.md] |
| V5 Input Validation | yes | Use Zod schemas for submit metadata, source refs, scope, and repository/API parsing. [VERIFIED: src/domain/ingestion.ts] [VERIFIED: src/api/schemas.ts] |
| V6 Cryptography | limited | Use `node:crypto` only for optional integrity hashes, not for identity or security guarantees. [VERIFIED: src/services/verdict-runner.ts] [CITED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection through draft metadata | Tampering | Keep parameterized repository queries and JSON casts; do not build SQL strings from labels or IDs. [VERIFIED: src/storage/repositories/ingestion-session-repository.ts] |
| Malformed scope selecting invalid segment ranges | Tampering | Validate with discriminated Zod schemas and repository existence/order checks before persistence. [VERIFIED: src/domain/ingestion.ts] |
| Source text offset mismatch | Repudiation | Store explicit `sourceTextRef` with normalization and test round-trip source slices. [VERIFIED: src/services/ingestion-session.ts] |
| Oversized chapter input | Denial of Service | Current submit schema requires non-empty text but has no max length; planner should add bounded test fixtures and consider a later explicit operational limit if product scope requires it. [VERIFIED: src/api/schemas.ts] |
| Raw text leaking into future inspection UI | Information Disclosure | Phase 9 should serialize source references and segment text only through explicit API schemas; UI grouping is Phase 12. [VERIFIED: src/api/schemas.ts] [CITED: .planning/ROADMAP.md] |

## Sources

### Primary (HIGH confidence)
- `.planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md` - locked Phase 9 decisions, discretion, deferred work.
- `.planning/REQUIREMENTS.md` - DRAFT-01 and DRAFT-03 requirement definitions.
- `.planning/ROADMAP.md` - Phase 9 success criteria and plan slices.
- `.planning/research/SUMMARY.md`, `.planning/research/ARCHITECTURE.md`, `.planning/research/STACK.md`, `.planning/research/PITFALLS.md`, `.planning/research/FEATURES.md` - v1.1 milestone research constraints.
- `AGENTS.md` - project constraints and GSD workflow requirements.
- `src/domain/ingestion.ts` - existing ingestion session, segment, candidate, review, and snapshot schemas.
- `src/services/ingestion-session.ts` - existing deterministic segmentation and submit/extract service flow.
- `src/storage/migrations/0001_canonical_core.sql`, `0002_verdict_runs.sql`, `0003_ingestion_review.sql` - existing table/migration patterns.
- `src/storage/repositories/ingestion-session-repository.ts` - existing repository parsing, save/load, patch, approval, and state computation patterns.
- `src/api/schemas.ts` and `src/api/routes/ingestion-submit.ts` - current additive API schema/serialization route surface.
- `tests/storage/ingestion-session-repository.test.ts`, `tests/services/natural-language-extraction.test.ts`, `tests/api/ingestion-review-api.test.ts`, `tests/api/check-controls-api.test.ts` - existing regression surfaces.
- npm registry via `npm view` - package versions and modified timestamps.
- Local verification via `npm run typecheck` and `npm run test:ingestion` - current baseline status.

### Secondary (MEDIUM confidence)
- None used.

### Tertiary (LOW confidence)
- None used.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - package versions were checked with `npm ls` and `npm view`, and the existing targeted suite passes. [VERIFIED: npm ls] [VERIFIED: npm registry] [VERIFIED: npm run test:ingestion]
- Architecture: HIGH - recommendations are constrained by locked Phase 9 decisions and existing code layering. [CITED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md] [VERIFIED: src/domain/index.ts] [VERIFIED: src/storage/schema.ts]
- Pitfalls: HIGH - most risks come directly from current code behavior or milestone research. [VERIFIED: src/services/ingestion-session.ts] [CITED: .planning/research/PITFALLS.md]

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 for codebase architecture; re-check npm registry versions if dependency work is proposed before planning.
