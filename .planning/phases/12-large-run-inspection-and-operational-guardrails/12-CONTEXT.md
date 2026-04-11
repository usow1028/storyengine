# Phase 12: Large-Run Inspection and Operational Guardrails - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 12 makes chapter-scale check results usable in the browser inspection surface and operationally honest when work is partial. It covers richer inspection payload structure for draft-scale runs, browser-side grouping and filtering for larger verdict sets, and explicit visibility for stale, unresolved, or failed review state.

This phase does not add new consistency-check capabilities, fuzzy diff logic, graph visualization, collaboration, or a separate workflow outside the existing inspection console. It improves how large draft-scale results are exposed and explored, not what the engine fundamentally decides.

</domain>

<decisions>
## Implementation Decisions

### Grouping Model
- **D-01:** Keep the existing verdict-kind triage as the fixed top-level classification in the browser inspection surface. Phase 12 should not replace the current `Hard Contradiction` / `Repairable Gap` / `Soft Drift` / `Consistent` rail.
- **D-02:** For large-run exploration, the default secondary grouping axis should be chapter or section centered. Within each verdict-kind bucket, results should group by draft section or chapter rather than by individual segment, review state, or run scope summary.

### Filtering Model
- **D-03:** Add a global filter bar near the top of the inspection surface rather than burying filtering inside the triage rail.
- **D-04:** The filter model should allow combinations, not just a single preset. Downstream planning should assume users can narrow a large run with multiple simultaneous criteria such as section or chapter, review state, and verdict-kind-related constraints.

### Partial-State Visibility
- **D-05:** Partial or unsafe run state must be surfaced prominently with a strong warning banner plus explicit counts. If a run contains stale segments, unresolved review state, or failed extraction paths, the inspection surface should make that obvious before the user starts browsing individual verdicts.
- **D-06:** This partial-state visibility is not a subtle metadata detail. The operational summary should be visually prominent near the inspection header rather than hidden only in row-level affordances.

### Provenance and Source Density
- **D-07:** Source and provenance hints should appear in both the list and the detail experience. Large-run exploration should not require opening every verdict just to understand which chapter, section, segment, or review state a result came from.
- **D-08:** The list view should carry lightweight provenance and review-state context, while the detail panel can still hold deeper source span and trace information. Phase 12 should not make provenance detail exclusively detail-panel-only.

### the agent's Discretion
- Exact filter control shape, ordering, and visual treatment, as long as the controls are global and combinable.
- Exact wording and severity styling for the partial-state warning banner, as long as the banner is prominent and includes meaningful counts.
- Exact list-row metadata density and truncation behavior, as long as section or chapter identity plus minimal provenance remain visible before selection.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and Phase Contracts
- `.planning/PROJECT.md` - v1.1 draft-scale milestone goals, validated Phase 09-11 capability baseline, and the requirement that larger draft workflows remain deterministic and traceable.
- `.planning/REQUIREMENTS.md` - Phase 12 requirement set `DRAFT-03`, `INSPECT-01`, `TRACE-01`, `OPER-01`, and `REVIEW-02`.
- `.planning/ROADMAP.md` - fixed Phase 12 scope, success criteria, and three planned work slices.
- `.planning/STATE.md` - current handoff after Phase 11 completion and the Phase 12 discuss session.

### Prior Phase Decisions
- `.planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md` - honest mixed-state visibility, explicit approval reset, and partial-review safety constraints that Phase 12 must expose clearly.
- `.planning/phases/11-scoped-checks-and-revision-diff/11-CONTEXT.md` - persisted scope identity, deterministic diff expectations, and lean but traceable finding-level output.
- `.planning/phases/11-scoped-checks-and-revision-diff/11-VERIFICATION.md` - verified Phase 11 behavior for scoped checks, explicit diff selection, and traceable `findingChanges`.

### Existing Inspection Surface
- `src/ui/App.tsx` - current inspection run loading flow, empty/loading/error states, and the top-level shell entrypoint.
- `src/ui/components/InspectionShell.tsx` - current inspection header, run metadata block, selected-verdict state, and two-column layout.
- `src/ui/components/VerdictTriageList.tsx` - current verdict-kind rail and row shape that Phase 12 must extend rather than replace.
- `src/ui/components/VerdictDetailPanel.tsx` - current detail-pane contract and the boundary between summary vs deep evidence.
- `src/ui/styles.css` - existing inspection layout, rail, header, and row styling hooks.
- `src/ui/inspection-client.ts` - current inspection fetch contract, which Phase 12 may need to extend for filter or grouping inputs.

### Inspection Data and API Contracts
- `src/domain/inspection.ts` - current inspection DTOs, groups, diff fields, trace payloads, and the contract that must expand additively.
- `src/services/inspection-payload.ts` - server-side inspection payload assembly and the natural place to add scope summaries, review-state counts, and grouping metadata.
- `src/api/routes/inspection.ts` - current public inspection route surface and query handling baseline.
- `src/api/schemas.ts` - inspection-facing API schema exports and additive response envelope boundaries.

### Verification Baselines
- `tests/api/inspection-api.test.ts` - public inspection API baseline to extend for larger-run payload guarantees.
- `tests/browser/inspection-surface.spec.ts` - current browser inspection surface baseline and the natural place to prove grouped/filterable exploration without regressing the existing console.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `InspectionShell` already provides a stable header plus triage-plus-detail layout. Phase 12 can extend this scaffold instead of inventing a different browser surface.
- `VerdictTriageList` already enforces fixed verdict-kind grouping and selection behavior. This is the right insertion point for section or chapter sub-grouping and lightweight provenance metadata.
- `VerdictDetailPanel` already separates deterministic verdict data, trace fields, repairs, and advisory output. Phase 12 can deepen provenance there without blurring hard-vs-soft boundaries.
- `inspection-payload.ts` already centralizes server-side assembly of grouped verdict data and diff context, making it the right place to add scope summaries, source spans, and review-state counts.

### Established Patterns
- Inspection payloads and UI contracts are Zod-first and additive.
- The browser inspection surface prefers a stable triage rail plus detail panel instead of multi-screen navigation.
- Hard verdict truth remains primary; advisory and operational status are additional layers, not replacements.
- Prior draft-scale phases favored explicit visibility over optimistic aggregation, so Phase 12 should surface partial-state counts honestly.

### Integration Points
- Extend inspection-domain payload types with scope summary, section or chapter metadata, source span summaries, and review-state counts.
- Extend `inspection-payload.ts` and `inspection.ts` route handling so the browser can receive large-run grouping and operational-summary fields without breaking existing consumers.
- Extend `InspectionShell`, `VerdictTriageList`, `VerdictDetailPanel`, and related styles to add the global filter bar, section-centered grouping, warning banner, and richer list metadata.
- Extend API and browser regression coverage so large-run grouping and partial-state visibility are verified, not just eyeballed.

</code_context>

<specifics>
## Specific Ideas

- Keep the existing `Verdict Triage` mental model. The user chose to preserve verdict-kind triage and layer chapter or section grouping inside it rather than replacing the navigation model.
- The filtering surface should live high in the page, not buried in the rail, and should support multi-constraint narrowing for large runs.
- Operational honesty matters enough that the warning treatment should be visually strong, not subtle metadata.
- Provenance should be visible before selection as well as after selection. Large-run inspection should not require opening every row to reorient yourself.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-large-run-inspection-and-operational-guardrails*
*Context gathered: 2026-04-11*
