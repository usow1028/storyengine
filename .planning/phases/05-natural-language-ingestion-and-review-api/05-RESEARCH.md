# Phase 5: Natural-Language Ingestion and Review API - Research

**Researched:** 2026-04-10
**Domain:** Natural-language intake, review-session state management, provenance-preserving correction loops, and on-demand check APIs over the existing canonical reasoning core
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

### the agent's Discretion
- Exact Fastify route naming and module layout, as long as the state machine and manual check trigger remain explicit.
- Exact review patch shape, as long as edits stay structured and auditable against original extraction candidates.
- Exact auto-segmentation heuristics, as long as segment boundaries remain review-editable.
- Exact persistence strategy for review sessions, as long as approved canonical writes remain revision-scoped and provenance-rich.
- Exact confidence thresholds and conflict heuristics, as long as ambiguous outputs remain visible instead of being silently flattened.

### Deferred Ideas (OUT OF SCOPE)
- Free-text annotation-first correction loops.
- Automatic checks on submission or approval.
- Multi-model voting or multi-pass extraction pipelines.
- Rich visual inspection UI or collaborative review features.
- Autonomous repair application during ingestion.
</user_constraints>

<research_summary>
## Summary

Phase 5 should add the first application-facing API surface without weakening the deterministic architecture already established in Phases 1 through 4. The cleanest implementation keeps three layers separate:

1. **Natural-language intake layer** for submission, segmentation, extraction, and review-session lifecycle.
2. **Canonical promotion layer** that accepts only approved structured edits and writes them through existing repository boundaries.
3. **Check execution layer** that reuses `executeVerdictRun` and remains manual/on-demand.

Because the repository currently has no HTTP framework, the recommended shape is a thin Fastify boundary over service modules rather than embedding business logic directly in route handlers. The API layer should translate HTTP requests into typed service calls, while the real phase work lives in new domain contracts, review-session repositories, and orchestration services.

The roadmap's two plans map cleanly to this split:

- **Plan 05-01:** Build the natural-language extraction and schema-validation pipeline. This includes submission contracts, auto-segmentation, extraction candidate schemas, provenance capture, review-session persistence, and submit/extract/read APIs.
- **Plan 05-02:** Implement the correction loop and check-mode controls. This includes structured patching, segment approval, canonical promotion of approved segments, explicit workflow states, and a manual `check` endpoint that calls `executeVerdictRun`.

The decisive architectural rule is that LLM output is never canonical by itself. The LLM may propose normalized candidates, but every candidate must:

1. pass schema validation,
2. carry source provenance and confidence,
3. remain reviewable if ambiguous or incomplete, and
4. be promoted only after explicit approval.

This preserves explainability while still letting writers work from prose-like input.
</research_summary>

<standard_stack>
## Recommended Stack

### Core
| Technology | Purpose | Why it fits Phase 5 |
|------------|---------|---------------------|
| Existing TypeScript + Zod domain layer | Submission, extraction, review, and promotion contracts | Keeps natural-language intake aligned with canonical schemas already used by the engine |
| Fastify | First HTTP/API surface for submit/review/approve/check routes | Matches the project stack guidance and keeps route handlers thin |
| Existing repository layer (`src/storage/repositories`) | Canonical persistence and audit-friendly writes | Avoids bypassing the source-of-truth write path when promoting approved segments |
| Existing verdict orchestration (`src/services/verdict-runner.ts`) | Manual check execution after approval | Satisfies the locked on-demand check decision without duplicating engine behavior |
| Vitest + pg-mem | Service, repository, and API regression coverage | Existing fast deterministic harness is already in place |

### Supporting
| Library / Module | Version | Purpose | When to Use |
|------------------|---------|---------|-------------|
| Existing provenance storage (`src/storage/repositories/provenance-repository.ts`) | current repo implementation | Persist source spans, extraction origins, and correction audit trails | Use for segment/item provenance and original-vs-corrected records |
| Existing story persistence (`src/storage/repositories/story-repository.ts`) | current repo implementation | Save approved canonical graph updates into story revisions | Use only after segment approval |
| Existing canonical schemas in `src/domain/*.ts` | current repo implementation | Normalize extraction candidates into canonical entities/events/state/rule structures | Use as the only admissible promotion target |
| Existing migration loading in `src/storage/schema.ts` | current repo implementation | Extend schema for review-session persistence if new tables are needed | Use if Phase 5 introduces dedicated review-session tables |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Thin Fastify routes + service orchestration | Route handlers that perform extraction and persistence directly | Simpler initially, but collapses API and domain logic into one layer |
| Dedicated review-session persistence | Only in-memory review state | Faster prototype, but breaks auditability and approval gating |
| Segment-level approval | Whole-draft finalization only | Less state to manage, but contradicts the locked chunk-oriented review model |
| Manual `check` endpoint reusing `executeVerdictRun` | Automatic checks after approval | More immediate feedback, but violates the explicit on-demand requirement |

**Installation:**
```bash
# Existing workspace already provides TypeScript, Vitest, and pg-mem.
# Phase 5 execution will likely add Fastify and any small route-testing helpers.
npm install
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```text
src/
├── domain/
│   └── ingestion.ts                  # submission, segment, candidate, review-state contracts
├── services/
│   ├── ingestion-session.ts          # submit, segment, extract, review-session orchestration
│   ├── ingestion-review.ts           # structured patching, approval, canonical promotion
│   ├── ingestion-check.ts            # manual check trigger over executeVerdictRun
│   └── index.ts
├── storage/
│   ├── migrations/0003_ingestion_review.sql
│   └── repositories/
│       ├── ingestion-session-repository.ts
│       └── ingestion-review-repository.ts
└── api/
    ├── app.ts                        # Fastify factory
    ├── routes/
    │   ├── ingestion-submit.ts
    │   ├── ingestion-review.ts
    │   └── ingestion-check.ts
    └── schemas.ts

tests/
├── services/
│   ├── natural-language-extraction.test.ts
│   └── ingestion-review-workflow.test.ts
├── storage/
│   └── ingestion-session-repository.test.ts
└── api/
    ├── ingestion-review-api.test.ts
    └── check-controls-api.test.ts
```

### Pattern 1: Review Session as a First-Class Boundary
**What:** Treat each natural-language submission as a review session with its own state machine, segments, extraction candidates, provenance, and approval status.
**When to use:** For both chunk submissions and full-draft submissions.
**Example:**
```typescript
const session = await createIngestionSession({
  storyId,
  revisionId,
  inputKind: "full_draft",
  rawText
});
```

### Pattern 2: Extract to Candidate Objects, Not Canonical Truth
**What:** Convert prose into typed candidate structures that mirror canonical entities/events/state/rules but remain marked as extracted proposals.
**When to use:** Immediately after segmentation and LLM-assisted extraction.
**Example:**
```typescript
const candidates = await extractStructuredCandidates({
  segmentText,
  promptFamily: "phase5-default"
});
```

### Pattern 3: Approval-Gated Canonical Promotion
**What:** Only approved segments may update the revision's canonical graph. Unapproved or ambiguous segments stay in review storage.
**When to use:** After structured edits are applied and the segment is explicitly approved.
**Example:**
```typescript
await promoteApprovedSegment({
  sessionId,
  segmentId,
  storyRepository,
  provenanceRepository
});
```

### Pattern 4: Manual Check Orchestration
**What:** `check` is a separate action that reads the approved canonical revision and runs the existing verdict pipeline.
**When to use:** Only when the user explicitly requests a check.
**Example:**
```typescript
const run = await executeApprovedRevisionCheck({
  storyId,
  revisionId,
  triggerKind: "manual"
});
```

### Pattern 5: Thin API Adapters
**What:** Fastify routes validate request/response payloads, call services, and return explicit workflow state, but do not contain extraction or promotion logic themselves.
**When to use:** For every HTTP surface added in Phase 5.
**Example:**
```typescript
app.post("/ingestion/submissions", async (request, reply) => {
  const result = await submitNaturalLanguageDraft(request.body);
  return reply.code(202).send(result);
});
```

### Anti-Patterns to Avoid
- **Directly writing LLM output into canonical tables:** This would bypass review and deterministic normalization.
- **Hidden auto-fixes on normalization failure:** Ambiguous or incomplete output must remain visible as `review_needed`.
- **Combining approval with automatic checking:** This collapses two locked workflow states into one implicit step.
- **Route handlers acting as the business layer:** It makes the first API surface difficult to test and extend.
- **Storing only final corrected values:** It destroys the extraction audit trail the user explicitly requested.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Canonical output shape | A new prose-specific event/state model | Existing canonical schemas in `src/domain` | Keeps extraction output promotable without ad hoc translation |
| Check execution | A second verdict orchestration path | `executeVerdictRun` from `src/services/verdict-runner.ts` | Preserves run lineage, finding IDs, and prior run chaining |
| Provenance tracking | Freeform JSON blobs with no owner model | Existing `ProvenanceRepository` patterns plus typed review-session records | Keeps auditability queryable and consistent |
| API validation | Untyped route bodies | Zod-backed request/response contracts | Prevents invalid extracted or patched shapes from leaking across boundaries |

**Key insight:** Phase 5 should add an intake-and-review shell around the engine, not a parallel story model and not a second checker.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Review State Leaking into Canonical Tables Too Early
**What goes wrong:** Draft candidates and half-corrected structures get stored as if they were approved story facts.
**Why it happens:** The implementation reuses canonical tables as temporary review storage.
**How to avoid:** Store review-session state separately and promote only approved segments into the canonical revision.
**Warning signs:** `StoryRepository.saveGraph` is called during extraction or patching rather than approval.

### Pitfall 2: Full-Draft Intake Becoming an Opaque One-Shot Import
**What goes wrong:** A long draft enters the system and cannot be corrected incrementally.
**Why it happens:** Automatic segmentation is treated as an internal detail instead of a user-facing review unit.
**How to avoid:** Persist explicit segment records and expose segment-level status, edits, and approval.
**Warning signs:** API responses have only session-level status with no segment list.

### Pitfall 3: Ambiguity Hidden Behind a Single “Best Guess”
**What goes wrong:** The system picks one parse and discards uncertainty or alternative candidates.
**Why it happens:** The extraction service optimizes for a clean final shape instead of an auditable review surface.
**How to avoid:** Preserve `confidence`, `provenance`, and `review_needed` on every candidate, and keep original extracted values even after user edits.
**Warning signs:** Review payloads contain only corrected values and no extraction metadata.

### Pitfall 4: Manual Check Policy Eroded by Convenience Shortcuts
**What goes wrong:** Submission or approval begins to trigger verdict runs implicitly.
**Why it happens:** The implementation tries to provide immediate feedback from inside the review loop.
**How to avoid:** Keep `check` as a separate endpoint and state transition that explicitly calls the verdict runner.
**Warning signs:** Approval handlers call `executeVerdictRun` directly.

### Pitfall 5: API Layer Coupled to a Specific Model Vendor
**What goes wrong:** Route design or persistence formats become tied to one LLM API response shape.
**Why it happens:** Extraction transport objects are stored raw instead of normalized into project contracts.
**How to avoid:** Normalize all extraction output into repo-owned schemas before persistence and hide vendor payloads behind service boundaries.
**Warning signs:** Repository methods accept provider-native payloads or route responses leak raw model output.
</common_pitfalls>

<sota_updates>
## Current-Practice Update

StoryGraph is now ready for a natural-language intake layer because earlier phases already established:

- canonical event/state/rule schemas,
- repository-backed revision persistence,
- provenance storage,
- deterministic verdict execution, and
- advisory soft-prior separation.

That means Phase 5 does **not** need to invent a new reasoning core. It only needs to wrap the existing one with:

- review-session persistence,
- candidate extraction and normalization,
- approval-gated promotion, and
- API endpoints that expose the workflow explicitly.

**New tools/patterns to consider later:**
- alternate extraction prompt families for different narrative styles,
- retrieval-assisted few-shot examples for extraction repair,
- multi-pass extraction that separates entities, events, and rules,
- collaborative review queues or UI-driven review dashboards.

**Deprecated/outdated for this phase:**
- automatic realtime verdicting during drafting,
- free-text-only correction loops,
- opaque “AI parsed it for you” APIs without provenance and audit data,
- provider-native payloads as a long-term persistence format.
</sota_updates>

## Validation Architecture

Phase 5 should preserve the same deterministic feedback loop as earlier phases, but now split validation across service, storage, and API boundaries:

- `tests/services/natural-language-extraction.test.ts` — chunk and full-draft submissions, segmentation, schema validation, confidence metadata, and `review_needed` routing
- `tests/storage/ingestion-session-repository.test.ts` — review-session persistence, segment status transitions, original-versus-corrected values, and provenance retention
- `tests/services/ingestion-review-workflow.test.ts` — structured patching, segment approval, and canonical promotion rules
- `tests/api/ingestion-review-api.test.ts` — submit/extract/read/review endpoints returning the explicit workflow states
- `tests/api/check-controls-api.test.ts` — manual `check` trigger behavior, separation from approval, and verdict-run integration

Vitest already exists, so Wave 0 is not about installing a test framework. Instead, Wave 0 for Phase 5 is creating the missing service and API test files early enough that every task has a concrete verification target. A dedicated script such as `npm run test:ingestion` should bundle the Phase 5 suite without watch mode.

The API tests should prefer Fastify's injection flow so Phase 5 can verify request/response behavior without external ports or browsers.

<open_questions>
## Open Questions

1. **Should review-session state live in new dedicated tables or in JSON columns attached to revisions?**
   - What we know: Approved canonical data must stay separate from in-review extracted candidates.
   - What's unclear: Whether the cleanest implementation is normalized session/segment tables or revision-level JSON sidecars.
   - Recommendation: Favor dedicated review-session tables because Phase 5 needs explicit segment status, provenance, and original-vs-corrected value history.

2. **Should approval write directly into the active revision or into a derived revision branch?**
   - What we know: The user wants existing `storyId/revisionId` targeting and approval-gated promotion.
   - What's unclear: Whether promotion mutates the targeted revision in place or creates a derived revision snapshot for approved intake results.
   - Recommendation: Start by preserving the existing revision target model, but keep the service boundary explicit so derived revisions can be added later without rewriting API contracts.

3. **How much raw extraction trace should be retained beyond normalized candidates?**
   - What we know: Source spans, confidence, and original extracted values are required.
   - What's unclear: Whether raw provider prompt/response payloads should also be stored.
   - Recommendation: Store only normalized candidates plus minimal provider metadata in Phase 5. Avoid provider-native payload persistence unless debugging proves it necessary.
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `.planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md` — locked Phase 5 decisions and workflow boundaries
- `.planning/ROADMAP.md` — Phase 5 goal, success criteria, and plan decomposition
- `.planning/REQUIREMENTS.md` — requirement IDs `FLOW-01` and `FLOW-03`
- `AGENTS.md` — project stack guidance, explainability constraints, and the recommendation to use Fastify for API surfaces
- `src/services/verdict-runner.ts` — existing manual verdict execution path that Phase 5 should reuse for the `check` step
- `src/storage/repositories/story-repository.ts` — canonical story/revision persistence boundary for approved segment promotion
- `src/storage/repositories/provenance-repository.ts` — existing provenance persistence pattern that Phase 5 should extend for item-level source and correction trails
- `src/services/explained-verdicts.ts` and `src/services/index.ts` — current service-layer orchestration and export patterns
- `src/storage/schema.ts` — current migration loading path relevant if Phase 5 adds review-session tables

### Secondary (MEDIUM confidence)
- `.planning/phases/01-canonical-narrative-schema/01-CONTEXT.md` — canonical contract expectations extraction must normalize into
- `.planning/phases/02-hard-constraint-engine/02-CONTEXT.md` — hard-check boundaries that manual review/check flows must not blur
- `.planning/phases/03-evidence-and-repair-reasoning/03-CONTEXT.md` — evidence and rerun semantics that manual checks already follow
- `.planning/phases/04-corpus-priors-and-soft-pattern-layer/04-CONTEXT.md` — soft prior separation rules that should remain outside the ingestion layer
- `tests/engine/verdict-runner.test.ts` — current pg-mem testing pattern for service-level orchestration
- `vitest.config.ts` and `package.json` — current test harness and command surface

### Tertiary (LOW confidence - needs validation)
- None. This research pass stayed inside locked project artifacts and the live codebase.
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: Fastify API boundary, LLM-assisted extraction, structured review sessions, approval-gated canonical promotion, manual check orchestration
- Ecosystem: existing TypeScript/Zod contracts, repositories, provenance storage, and Vitest/pg-mem harness
- Patterns: explicit state machine, candidate-vs-canonical separation, provenance-rich correction loop, service-first API design
- Pitfalls: premature canonical writes, opaque full-draft imports, hidden ambiguity, auto-triggered checks, provider-coupled persistence

**Confidence breakdown:**
- Standard stack: HIGH - directly grounded in AGENTS guidance and current repo dependencies/patterns
- Architecture: HIGH - reuses existing service/repository/verdict-runner boundaries rather than inventing a second reasoning path
- Pitfalls: HIGH - derived from the exact failure modes created by adding natural-language ingestion in front of a deterministic core
- Code examples: MEDIUM - they describe target shapes for planning, not an already implemented Phase 5 intake layer

**Research date:** 2026-04-10
**Valid until:** 2026-05-10
</metadata>

---

*Phase: 05-natural-language-ingestion-and-review-api*
*Research completed: 2026-04-10*
*Ready for planning: yes*
