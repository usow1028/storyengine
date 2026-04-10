# Phase 8: Interactive Inspection Surface - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 8 delivers the first interactive inspection surface for StoryGraph consistency results. It lets a user inspect verdicts, evidence, repairs, soft-prior advisory output, and linked event/state/rule traces without reading raw storage records.

This phase is scoped to inspection and structured viewing. It does not add new reasoning rules, automatic story repair, raw prior-pattern browsing, project/user prior authoring, collaboration, export workflows, or a full advanced visualization product. Graph-heavy exploration may be prepared for later, but the Phase 8 deliverable should stay focused on a usable first UI surface for `FLOW-02`.

</domain>

<decisions>
## Implementation Decisions

### Surface Form
- **D-01:** Phase 8 should introduce a minimal frontend shell rather than staying API-only or Fastify HTML-only.
- **D-02:** The frontend shell must remain intentionally small and inspection-focused. The exact frontend stack is the agent's discretion, but planning must include browser-based verification and avoid turning this into a broad design-system phase.
- **D-03:** Existing Fastify APIs may be extended with inspection endpoints, but the user-facing proof should include an actual browser-usable view, not only JSON responses.

### Initial Information Architecture
- **D-04:** The first screen should be organized around a verdict-kind triage list, grouped by `Hard Contradiction`, `Repairable Gap`, `Soft Drift`, and `Consistent`.
- **D-05:** The triage list is the user's starting point for deciding what to inspect or fix first. Run history and diff views may support the detail view, but they should not be the first screen.
- **D-06:** Selecting a verdict should drill into evidence, timeline, repair, and advisory details without losing the triage context.

### Evidence Display Depth
- **D-07:** Verdict detail should default to concise, writer-readable evidence: reason summary, related event/state/rule summaries, and repair direction.
- **D-08:** Traceability fields must be available through expandable detail sections, including `findingId`, `reasonCode`, conflict path, missing premises, supporting findings, event IDs, state boundary IDs, and rule version IDs where present.
- **D-09:** The UI must preserve StoryGraph's engineering-inspection feel: every visible judgment should be traceable to explicit structured data, not prose-only explanation.

### Timeline and Detail Layout
- **D-10:** Use a split view: left side verdict triage list, right side selected verdict details with event timeline and evidence detail.
- **D-11:** The timeline should show related event order and linked state/rule evidence for the selected verdict. It should not attempt a full node graph as the primary Phase 8 interaction.
- **D-12:** Full graph-first visualization is deferred. If a graph projection is introduced, it must be secondary and only where it supports the split-view inspection goal.

### Repairs and Soft-Prior Advisory
- **D-13:** Repair candidates should appear inside the relevant hard verdict detail, because they explain how that verdict could be repaired.
- **D-14:** Soft-prior and soft-drift information should appear as a visually and semantically separate advisory band, not merged into the hard verdict fields or repair list.
- **D-15:** The advisory band should expose the Phase 7 `softPrior` data that is useful for inspection: status, dominant layer, representative pattern summary, triggered drifts, contribution evidence, repair plausibility adjustments, and unavailable-state reasons.
- **D-16:** The UI must keep hard/soft boundaries explicit. Corpus-derived priors can inform advisory interpretation and repair plausibility, but must not appear to override hard verdict truth.

### the agent's Discretion
- Exact minimal frontend stack, build tool, and package additions, provided the result is easy to run locally and can be verified through automated tests plus browser checks.
- Exact route names for inspection APIs and frontend pages, provided they fit existing Fastify route style and remain readable.
- Exact component names, layout breakpoints, copy length, and visual hierarchy, provided the locked split-view and hard/soft separation decisions are honored.
- Whether run history/diff appears as a compact secondary panel, badge, or expandable section.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and Requirement Scope
- `.planning/ROADMAP.md` - Phase 8 goal, success criteria, `FLOW-02` requirement, and planned two-slice scope.
- `.planning/REQUIREMENTS.md` - `FLOW-02` remains pending and defines the structured analysis view requirement.
- `.planning/PROJECT.md` - project principles: explainability, default physics, hybrid architecture, and logic-led deterministic judgment.
- `.planning/STATE.md` - current milestone progress and Phase 8 readiness state.

### Prior Decisions
- `.planning/phases/02-hard-constraint-engine/02-CONTEXT.md` - locked hard verdict semantics and checker-family boundaries.
- `.planning/phases/03-evidence-and-repair-reasoning/03-CONTEXT.md` - evidence, explanation, repair, rerun, and diff decisions that Phase 8 must surface.
- `.planning/phases/04-corpus-priors-and-soft-pattern-layer/04-CONTEXT.md` - soft-prior separation rules and representative pattern evidence decisions.
- `.planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md` - submit/extract/review/approve/check state machine and manual check trigger.
- `.planning/phases/07-soft-prior-runtime-integration/07-CONTEXT.md` - Phase 7 hard/soft separation and `softPrior` response contract decisions.
- `.planning/phases/07-soft-prior-runtime-integration/07-VERIFICATION.md` - verified Phase 7 behavior that Phase 8 can rely on.
- `.planning/phases/07-soft-prior-runtime-integration/07-SECURITY.md` - threat posture around request-supplied prior config, raw artifact disclosure, and hard/soft separation.

### Code Surfaces
- `src/api/app.ts` - existing Fastify app composition and dependency boundary.
- `src/api/schemas.ts` - current ingestion response and `softPrior` response schemas.
- `src/api/routes/ingestion-check.ts` and `src/api/routes/ingestion-read.ts` - current route patterns for check/read flows.
- `src/services/verdict-runner.ts` - hard verdict execution and Phase 7 advisory attachment point.
- `src/services/ingestion-check.ts` - manual check service result shape.
- `src/services/explained-verdicts.ts` - deterministic explanation record construction.
- `src/services/verdict-diff.ts` - prior-run comparison service.
- `src/services/story-boundary-query.ts` - character state boundary query service for state inspection.
- `src/storage/repositories/verdict-repository.ts` and `src/storage/repositories/verdict-run-repository.ts` - current query primitives for verdicts and run history.
- `tests/api/check-controls-api.test.ts` - app.inject test harness and Phase 7 end-to-end check flow.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/api/app.ts` composes Fastify route modules with explicit dependencies. Phase 8 can add inspection routes without changing the existing ingestion routes.
- `src/api/schemas.ts` already exposes a parsed `CheckIngestionResponseSchema` with a separate `softPrior` block. Phase 8 should reuse or extend structured schemas instead of returning ad hoc JSON.
- `src/services/explained-verdicts.ts` builds deterministic explanations and evidence snapshots. These records are the main source for default evidence summaries and expanded trace detail.
- `src/services/verdict-diff.ts` compares the current run against the immediately previous run. This can support secondary run-change indicators without making diff the first screen.
- `src/services/story-boundary-query.ts` can provide state facts at event boundaries for detail/timeline inspection.
- `VerdictRepository.listForRun` and `VerdictRunRepository.listRunsForRevision` already provide storage access needed for run-scoped inspection.

### Established Patterns
- API routes are Fastify modules under `src/api/routes`, registered from `buildStoryGraphApi`.
- Route outputs should pass through Zod schemas before being sent, matching the current ingestion check route.
- Tests use Vitest with `app.inject()` and pg-mem-backed repositories for API-level verification without opening sockets.
- Prior phases prefer deterministic, structured evidence over LLM text. UI copy should present that structure clearly rather than inventing new explanations.

### Integration Points
- Add an inspection service or route layer that reads verdict runs, verdict records, evidence snapshots, repair candidates, soft-prior advisory data, and optional boundary facts.
- Add a minimal frontend shell that consumes inspection data and renders the locked split-view: triage list left, selected verdict timeline/detail right.
- Browser verification should prove a real user can navigate from grouped verdicts into evidence, timeline, repair, and advisory sections.

</code_context>

<specifics>
## Specific Ideas

- The first usable screen should answer: "What kind of consistency result am I looking at, and what should I inspect first?"
- The UI should feel like an engineering inspection console for writers: readable, structured, and traceable.
- `Hard Contradiction`, `Repairable Gap`, and `Soft Drift` must be visually distinguishable without implying that soft drift has hard-rule authority.
- Expanded trace detail should remain available because raw storage records are not acceptable as the inspection interface.

</specifics>

<deferred>
## Deferred Ideas

- Full node-graph-first visualization is deferred beyond Phase 8.
- Raw prior pattern browsing and similar-case corpus exploration remain deferred.
- Automatic story repair, applying fixes from the UI, and generation workflows are out of scope.
- Full design-system expansion, collaboration, export, and advanced manuscript-scale navigation are out of scope.

</deferred>

---

*Phase: 08-interactive-inspection-surface*
*Context gathered: 2026-04-10*
