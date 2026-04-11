# Phase 12: Large-Run Inspection and Operational Guardrails - Research

**Researched:** 2026-04-11
**Domain:** large-run inspection payload enrichment, browser grouping/filtering, provenance projection, and operational honesty for partial draft workflows
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

Source: [CITED: .planning/phases/12-large-run-inspection-and-operational-guardrails/12-CONTEXT.md]

### Locked Decisions

#### Grouping Model
- **D-01:** Keep the existing verdict-kind triage as the fixed top-level classification in the browser inspection surface.
- **D-02:** Within each verdict-kind bucket, the default secondary grouping axis is chapter or section centered.

#### Filtering Model
- **D-03:** Filtering belongs in a global top filter bar, not inside the triage rail.
- **D-04:** Filters must be combinable rather than limited to one preset.

#### Partial-State Visibility
- **D-05:** Partial or unsafe state must be surfaced with a strong warning banner plus explicit counts.
- **D-06:** The warning treatment belongs near the inspection header, not only in row-level affordances.

#### Provenance and Source Density
- **D-07:** Provenance hints must appear in both list and detail.
- **D-08:** List rows carry lightweight provenance and review-state context; detail can show deeper source-span and trace information.

### Existing Boundaries to Preserve

- Hard verdict truth and soft-prior advisory output stay separate. [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md] [CITED: .planning/phases/11-scoped-checks-and-revision-diff/11-CONTEXT.md]
- Phase 12 extends the existing inspection console instead of inventing a new workflow family. [CITED: .planning/phases/12-large-run-inspection-and-operational-guardrails/12-CONTEXT.md]

### Claude's Discretion

- Exact filter control ordering and control types, as long as filters stay global and combinable.
- Exact warning-banner wording and styling, as long as unsafe state is visually prominent and quantified.
- Exact density of row metadata, as long as chapter or section identity and minimal provenance remain visible before selection.

### Deferred Ideas (OUT OF SCOPE)

- Heavy graph visualization or alternate navigation models.
- Fuzzy diffing, new check modes, or collaboration workflows.
- Queue-backed async inspection loading beyond the existing run-inspection path.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DRAFT-03 | System preserves stable segment labels, order, source offsets, and source text references from submission through inspection. | Phase 12 should project existing segment labels, section labels, and source span metadata into the inspection DTO instead of leaving them trapped in ingestion-session and provenance records. [CITED: .planning/REQUIREMENTS.md] [VERIFIED: src/api/schemas.ts] [VERIFIED: src/services/ingestion-review.ts] |
| INSPECT-01 | User can inspect larger draft-check runs through grouped and filterable verdict output without losing deterministic evidence. | Keep `VERDICT_KIND_ORDER` and current rail semantics, then add section-centered grouping keys and global client-side filters on top of the additive payload. [CITED: .planning/REQUIREMENTS.md] [VERIFIED: src/domain/inspection.ts] [VERIFIED: src/ui/components/InspectionShell.tsx] [VERIFIED: src/ui/components/VerdictTriageList.tsx] |
| TRACE-01 | Every verdict, repair, and diff item remains traceable to canonical IDs, rule IDs, and original draft source spans. | Existing detail trace already exposes IDs; the missing layer is explicit source-span and segment-context projection into list/detail metadata. [CITED: .planning/REQUIREMENTS.md] [VERIFIED: src/domain/inspection.ts] [VERIFIED: src/storage/repositories/provenance-repository.ts] |
| OPER-01 | Long-running or partially failed draft analysis reports resumable progress and failure state instead of appearing complete. | The inspection response must expose partial-state counts and warning flags derived from ingestion progress/session state or a persisted run snapshot summary. [CITED: .planning/REQUIREMENTS.md] [VERIFIED: src/api/schemas.ts] [VERIFIED: src/services/verdict-runner.ts] |
| REVIEW-02 | User can see which entities, events, state boundaries, causal links, and rules came from each draft segment before promotion. | Phase 10 already persists segment-local provenance detail; Phase 12 should reuse those segment/provenance links inside inspection rows and details without changing deterministic verdict logic. [CITED: .planning/REQUIREMENTS.md] [VERIFIED: src/services/ingestion-review.ts] [VERIFIED: src/storage/repositories/provenance-repository.ts] |
</phase_requirements>

## Summary

Phase 12 is a payload-shaping and inspection-surface phase, not a new reasoning phase. The deterministic checker, scoped execution, and revision diffing already exist from Phases 10 and 11. What is still missing is the ability to browse a chapter-scale run without losing orientation: the current inspection response exposes only `run`, flat verdict-kind groups, per-verdict details, and optional diff data, while the UI still renders a flat list under each verdict kind with no section grouping, no top filter bar, and no operational warning surface. [VERIFIED: src/domain/inspection.ts] [VERIFIED: src/services/inspection-payload.ts] [VERIFIED: src/ui/components/InspectionShell.tsx] [VERIFIED: src/ui/components/VerdictTriageList.tsx]

The safest implementation path is additive. Phase 12 should extend the inspection DTO with run-level scope and operational summaries plus per-verdict section or chapter grouping keys and provenance summaries, then let the browser derive grouped and filtered views locally while preserving the fixed verdict-kind rail. This keeps deterministic truth in the existing run payload, avoids introducing a second inspection API, and satisfies the user's requirement that large-run exploration remain explainable and traceable. [CITED: .planning/phases/12-large-run-inspection-and-operational-guardrails/12-CONTEXT.md] [VERIFIED: src/domain/inspection.ts] [VERIFIED: src/ui/inspection-client.ts]

The operational-honesty requirement is the other major constraint. Existing ingestion session snapshots already expose `progressSummary`, segment workflow state, stale flags, failure summaries, and approval markers, while review provenance records already store `sessionId`, `segmentId`, and source-span boundaries. Phase 12 should reuse that data so the inspection surface can show a strong warning banner and lightweight row provenance without changing the deterministic verdict engine. The main design choice is where to materialize that data: the lowest-risk answer is to persist an operational summary into the inspection snapshot at run time and resolve richer section or segment labels lazily when building the inspection payload. [VERIFIED: src/api/schemas.ts] [VERIFIED: src/services/ingestion-review.ts] [VERIFIED: src/services/verdict-runner.ts] [VERIFIED: src/storage/repositories/provenance-repository.ts]

## Project Constraints (from AGENTS.md)

- Explainability is non-negotiable. Grouping and filtering cannot collapse or hide deterministic evidence; list and detail still need canonical IDs and source references. [CITED: AGENTS.md]
- Deterministic judgment remains logic-led. Phase 12 must not turn inspection grouping or partial-state summaries into a second scoring layer. [CITED: AGENTS.md]
- The milestone still prioritizes structured, auditable contracts over UI novelty. Any browser changes must preserve additive Zod-first API/domain contracts. [CITED: AGENTS.md] [VERIFIED: src/domain/inspection.ts]

## Current Implementation Snapshot

### What Already Exists

- `RunInspectionResponseSchema` already provides `run`, `groups`, `selectedVerdictId`, `detailsByVerdictId`, and optional `diff`. [VERIFIED: src/domain/inspection.ts]
- `buildRunInspectionPayload()` already normalizes diff data, orders verdict kinds by `VERDICT_KIND_ORDER`, and builds consistent summary/detail objects for each verdict. [VERIFIED: src/services/inspection-payload.ts]
- `InspectionShell` already has a stable split-view layout with run metadata, triage rail, and detail panel. [VERIFIED: src/ui/components/InspectionShell.tsx]
- `VerdictTriageList` already preserves fixed verdict-kind grouping and deterministic ordering. [VERIFIED: src/ui/components/VerdictTriageList.tsx]
- `VerdictDetailPanel` already separates deterministic verdict fields, evidence, trace, repairs, and advisory signal. [VERIFIED: src/ui/components/VerdictDetailPanel.tsx]
- API coverage and browser coverage already exist for the current inspection route and rendered surface. [VERIFIED: tests/api/inspection-api.test.ts] [VERIFIED: tests/browser/inspection-surface.spec.ts] [VERIFIED: tests/ui/inspection-shell.test.ts]

### What Is Missing

- No run-level inspection contract currently exposes scope summary, progress or partial-state summary, or filter metadata. [VERIFIED: src/domain/inspection.ts]
- Summary rows carry only category, event count, repair count, and explanation; they do not expose section or chapter identity, segment labels, source spans, or review-state context. [VERIFIED: src/domain/inspection.ts] [VERIFIED: src/services/inspection-payload.ts]
- The header shows only run or revision identifiers and trigger metadata; it does not reveal stale segments, unresolved review, failed extraction, or scope coverage. [VERIFIED: src/ui/components/InspectionShell.tsx]
- The current UI has no top filter bar and no secondary grouping inside a verdict-kind bucket. [VERIFIED: src/ui/components/InspectionShell.tsx] [VERIFIED: src/ui/components/VerdictTriageList.tsx]
- `fetchRunInspection()` loads by `runId` only and does not need new query parameters for browser-local filtering. [VERIFIED: src/ui/inspection-client.ts]

## Relevant Data Sources Already In The Codebase

### Ingestion Progress and Mixed-State Signals

`IngestionSessionResponseSchema` already serializes a draft-scale `progressSummary` with `totalSegments`, `approvedSegments`, `needsReviewSegments`, `failedSegments`, and `staleSegments`, plus per-segment workflow state, stale reason, attempts, and failure summaries. This is the vocabulary Phase 12 should reuse for the run-level operational banner instead of inventing a parallel status model. [VERIFIED: src/api/schemas.ts]

### Provenance and Source Spans

Phase 10 provenance records already persist `sessionId`, `segmentId`, `sourceSpanStart`, and `sourceSpanEnd` inside `detail`, keyed by deterministic `provenanceId`. Those records are the bridge from a verdict trace back to the draft segment and source span that produced it. [VERIFIED: src/services/ingestion-review.ts] [VERIFIED: src/storage/repositories/provenance-repository.ts]

### Stored Scope Metadata

Phase 11 verdict runs already persist scope metadata including `scopeId`, `scopeKind`, `segmentIds`, `eventIds`, and `sourceTextRefs`. That provides run-level scope identity and is the right baseline for `scopeSummary`, even when additional per-verdict provenance has to come from the provenance/session path. [VERIFIED: src/domain/verdicts.ts] [VERIFIED: src/storage/repositories/verdict-run-repository.ts]

## Recommended Implementation Patterns

### Pattern 1: Expand The Inspection DTO Additively Instead Of Replacing Existing Shapes

**What:** Extend the inspection-domain contract with:
- a run-level `scopeSummary`,
- a run-level `operationalSummary`,
- additive grouping/filter metadata for large runs,
- a lightweight provenance summary on each verdict row,
- a richer source-context block on each verdict detail.

**Why:** The UI already depends on the current `groups` and `detailsByVerdictId` shape. Additive expansion preserves current consumers and keeps Phase 12 aligned with the project's Zod-first boundary pattern. [VERIFIED: src/domain/inspection.ts] [VERIFIED: src/services/inspection-payload.ts]

**Recommendation:** Keep `groups[].verdicts[]` as the canonical list, but add stable grouping keys such as section/chapter identity and row-level source metadata so the browser can derive subgroups locally without losing deterministic ordering.

### Pattern 2: Persist Run-Time Operational Summary Into Inspection Snapshots

**What:** Extend `RunInspectionSnapshotSchema` and `createRunInspectionSnapshot()` so a verdict run captures a sanitized operational summary at check time, for example:
- segment counts by workflow state,
- stale/failure/unresolved totals,
- warning flags,
- scope coverage counts.

**Why:** `executeVerdictRun()` already persists the inspection snapshot at run creation time. Adding operational summary there avoids an inspection route that has to reconstruct every banner state from unrelated live session queries and keeps the warning banner tied to the exact run being inspected. [VERIFIED: src/services/verdict-runner.ts] [VERIFIED: src/services/inspection-payload.ts]

**Important:** Keep this summary sanitized and structured. Do not persist raw ingestion-session snapshots or verbose attempt payloads inside the inspection snapshot.

### Pattern 3: Resolve Per-Verdict Section And Segment Context Through Provenance

**What:** Extend `buildRunInspectionPayload()` to accept `provenanceRepository` and `ingestionSessionRepository` so it can:
1. read provenance records referenced by `verdict.trace.provenanceIds`,
2. resolve `sessionId` and `segmentId` from provenance detail,
3. load the referenced ingestion-session snapshot(s),
4. map segments to section labels, draft paths, source refs, and review-state labels,
5. project that into row-level and detail-level provenance summaries.

**Why:** The information needed for chapter or section grouping and source-span display already exists, but it is split between provenance records and session snapshots. Reusing that path avoids inventing a new provenance store or weakening traceability to opaque labels. [VERIFIED: src/services/ingestion-review.ts] [VERIFIED: src/storage/repositories/provenance-repository.ts] [VERIFIED: src/api/schemas.ts]

### Pattern 4: Keep Filtering And Secondary Grouping Client-Side

**What:** After Phase 12 payload enrichment, derive filtered and section-centered grouped views in the browser instead of extending the inspection API with new filter query parameters.

**Why:** `fetchRunInspection()` currently loads a single run by `runId`, and chapter-scale runs are still small enough to group or filter client-side. Local derivation avoids coupling the API contract to transient UI control state, preserves deterministic run truth, and keeps the current route surface stable. [VERIFIED: src/ui/inspection-client.ts] [VERIFIED: src/api/routes/inspection.ts]

**Recommendation:** Use a top-level filter state in `InspectionShell` and compute derived verdict lists from the additive payload while keeping `VERDICT_KIND_ORDER` as the outer frame.

### Pattern 5: Preserve The Existing Shell And Insert Guardrails Near The Header

**What:** Keep `InspectionShell` as the composition root, but add:
- a prominent operational banner directly under the run metadata,
- a global filter bar above the split layout,
- verdict-row provenance badges and secondary group headings inside `VerdictTriageList`,
- source-context sections in `VerdictDetailPanel`.

**Why:** The current shell, rail, and detail boundary are already stable and tested. Phase 12 only needs to deepen the existing browsing surface, not replace it. [VERIFIED: src/ui/components/InspectionShell.tsx] [VERIFIED: src/ui/components/VerdictTriageList.tsx] [VERIFIED: src/ui/components/VerdictDetailPanel.tsx]

### Pattern 6: Use Mixed-State Fixtures To Prove Honesty End-To-End

**What:** Extend service, API, UI, and browser tests with fixtures where a run is inspectable but the underlying draft still has stale, failed, or unresolved segments outside the safe scope.

**Why:** Phase 12's central risk is false reassurance. Tests should prove that the inspection surface remains usable while still surfacing the incomplete or risky state prominently. [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md] [VERIFIED: tests/api/inspection-api.test.ts] [VERIFIED: tests/browser/inspection-surface.spec.ts]

## Recommended 3-Plan Split

### Plan 12-01: Payload And Contract Enrichment

Focus on domain/API/service contracts:
- extend inspection schemas additively,
- capture run-level operational summary,
- resolve per-verdict section/segment/source metadata,
- expose filterable grouping keys and counts.

### Plan 12-02: Browser Grouping, Filtering, And Provenance UX

Focus on the inspection UI:
- add a top filter bar,
- preserve fixed verdict-kind triage,
- group rows by section or chapter within each verdict kind,
- surface a strong warning banner and row/detail provenance.

### Plan 12-03: Operational Guardrail Regressions And Milestone Verification

Focus on proof:
- extend API/UI/browser fixtures with mixed-state large-run cases,
- verify no hard/soft leakage and no raw snapshot leaks,
- capture the command matrix needed for Phase 12 verification and v1.1 milestone closure.

## Anti-Patterns To Avoid

- **Server-driven filter sprawl for a single-run inspection view:** unnecessary API complexity when the payload can remain deterministic and the browser can derive filtered views locally. [VERIFIED: src/ui/inspection-client.ts]
- **Replacing the verdict-kind rail with section-first navigation:** directly violates the locked discuss decision to preserve verdict-kind triage. [CITED: .planning/phases/12-large-run-inspection-and-operational-guardrails/12-CONTEXT.md]
- **Hiding partial-state risk only in row badges or detail text:** violates the requirement for a strong warning banner near the header. [CITED: .planning/phases/12-large-run-inspection-and-operational-guardrails/12-CONTEXT.md]
- **Embedding raw ingestion session or prior-runtime internals in inspection payloads:** Phase 11 already avoided leaking raw advisory config; Phase 12 should keep the same discipline for operational summaries. [VERIFIED: src/services/verdict-runner.ts] [VERIFIED: tests/engine/verdict-runner.test.ts]
- **Projecting section labels without stable source references:** if grouping keys cannot be traced back to stored provenance or session structure, the UI becomes un-auditable. [VERIFIED: src/services/ingestion-review.ts] [VERIFIED: src/storage/repositories/provenance-repository.ts]

## Common Pitfalls

### Pitfall 1: Row-Level Provenance Is Derived Only From `run.scope`
**What goes wrong:** A full-draft run would show identical scope metadata on every row, so users still cannot tell which section or segment a specific verdict came from.
**How to avoid:** Derive row-level provenance from verdict trace provenance and session segment metadata, not only the run-level scope object.

### Pitfall 2: Partial-State Banner Recomputes Against The Wrong Session
**What goes wrong:** The inspection surface shows warning counts from a later or unrelated session instead of the state that existed when the run was created.
**How to avoid:** Persist a sanitized operational summary with the inspection snapshot at run time, and only use live session lookups for label enrichment where identity is explicit.

### Pitfall 3: Filtering Changes The Canonical Triage Order
**What goes wrong:** Local grouping/filter code reorders verdict kinds or merges them under section headers, breaking the fixed mental model.
**How to avoid:** Keep `VERDICT_KIND_ORDER` as the outer loop and apply section grouping only inside each verdict-kind bucket.

### Pitfall 4: Provenance Density Bloats Every List Row
**What goes wrong:** Rows become unreadable because they inline raw spans, IDs, or large source excerpts.
**How to avoid:** Keep rows to lightweight chapter/section/segment labels plus concise source-span badges; reserve canonical IDs, source refs, and deeper trace for the detail panel.

## Assumptions Log

없음. 이 문서는 현재 코드, 현재 phase context, 현재 requirements/roadmap, 그리고 로컬에서 직접 확인 가능한 테스트/도메인 계약만 사용했다. 권고안은 그 근거에서 직접 도출했다. [VERIFIED: src/domain/inspection.ts] [VERIFIED: src/services/inspection-payload.ts] [VERIFIED: src/services/ingestion-review.ts] [VERIFIED: src/ui/components/InspectionShell.tsx]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `3.2.4` plus Playwright `1.59.1`. `[VERIFIED: package.json]` |
| Config file | `vitest.config.ts` and Playwright default config from package script. `[VERIFIED: package.json]` |
| Quick run command | `npm exec -- vitest run tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts tests/ui/inspection-shell.test.ts --bail=1` |
| Full suite command | `npm run typecheck && npm run test:reasoning && npm run test:ingestion && npm exec -- vitest run tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts tests/ui/inspection-shell.test.ts --bail=1 && npm run test:browser -- tests/browser/inspection-surface.spec.ts` |
| Estimated runtime | ~35-70 seconds locally |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DRAFT-03 | inspection payload rows and details preserve stable section or segment labels plus source span references | service + UI | `npm exec -- vitest run tests/services/inspection-payload.test.ts tests/ui/inspection-shell.test.ts --bail=1` | ✅ existing files extendable |
| INSPECT-01 | browser can group and filter larger verdict sets without replacing verdict-kind triage | UI + browser | `npm exec -- vitest run tests/ui/inspection-shell.test.ts --bail=1 && npm run test:browser -- tests/browser/inspection-surface.spec.ts` | ✅ existing files extendable |
| TRACE-01 | inspection list/detail remain traceable to canonical IDs, provenance IDs, and source spans | service + API | `npm exec -- vitest run tests/services/inspection-payload.test.ts tests/api/inspection-api.test.ts --bail=1` | ✅ existing files extendable |
| OPER-01 | inspectable runs still surface stale, failed, or unresolved counts prominently | API + UI + browser | `npm exec -- vitest run tests/api/inspection-api.test.ts tests/ui/inspection-shell.test.ts --bail=1 && npm run test:browser -- tests/browser/inspection-surface.spec.ts` | ✅ existing files extendable |
| REVIEW-02 | inspection rows and detail show which draft segments contributed to a verdict | service + UI | `npm exec -- vitest run tests/services/inspection-payload.test.ts tests/ui/inspection-shell.test.ts --bail=1` | ✅ existing files extendable |

### Sampling Rate

- **After every task commit:** run `npm run typecheck` plus the smallest touched Vitest file set.
- **After every plan wave:** run the quick command above and the relevant browser or UI slice if the wave touched rendering logic.
- **Before `/gsd-verify-work`:** run the full suite command exactly.
- **Max feedback latency:** 70 seconds for targeted UI plus browser checks where practical.

### Wave 0 Gaps

- [ ] Extend `tests/services/inspection-payload.test.ts` — run-level operational summary, section grouping keys, provenance summaries, and sanitized source-span projection.
- [ ] Extend `tests/api/inspection-api.test.ts` — new inspection response contract, partial-state counts, and additive filter or grouping metadata.
- [ ] Extend `tests/ui/inspection-shell.test.ts` — strong warning banner, global filter bar, grouped section headings, and row/detail provenance rendering.
- [ ] Extend `tests/browser/inspection-surface.spec.ts` — large-run browsing, preserved verdict-kind order, filter interaction, and warning-banner visibility.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | yes | Treat inspection visibility as state transparency: unsafe or partial state must be surfaced, not hidden by UI defaults. |
| V5 Input Validation | yes | Keep additive Zod schemas for inspection response shapes and any new filter-state serialization. |
| V8 Data Protection | yes | Expose sanitized summaries and source references only; do not leak raw snapshots, prompt payloads, or internal artifact paths. |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Partial draft state appears fully safe in inspection | Integrity | Persist and display explicit operational warning counts near the header. |
| Section grouping loses deterministic triage ordering | Integrity | Keep verdict kind as the outer grouping frame and derive secondary grouping inside each bucket. |
| Provenance labels become opaque or untraceable | Repudiation | Build row/detail provenance from persisted provenance IDs and session segment/source refs. |
| Inspection payload leaks raw operational internals | Information Disclosure | Project only sanitized counts, labels, and source spans into the response. |

## RESEARCH COMPLETE
