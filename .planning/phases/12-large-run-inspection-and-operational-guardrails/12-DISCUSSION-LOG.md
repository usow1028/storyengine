# Phase 12: Large-Run Inspection and Operational Guardrails - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 12-large-run-inspection-and-operational-guardrails
**Areas discussed:** Grouping model, Filtering model, Partial-state visibility, Provenance density

---

## Grouping Model

| Option | Description | Selected |
|--------|-------------|----------|
| section/chapter centered | Keep verdict-kind triage, then group large-run results by chapter or section for location-aware browsing. | ✓ |
| segment centered | Group directly by segment for maximum granularity, but with higher browsing overhead on large runs. | |
| review-state centered | Group first by `approved/current`, `stale`, `needs_review`, or `failed` state. | |
| scope summary centered | Lead with run-scope summary as the primary grouping model. | |

**User's choice:** section/chapter centered  
**Notes:** The user accepted the recommended option so large-run browsing stays anchored to draft structure while preserving fixed verdict-kind triage.

---

## Filtering Model

| Option | Description | Selected |
|--------|-------------|----------|
| global top filter bar with combinations | Put filtering controls near the top and allow multiple constraints to be combined in one run view. | ✓ |
| global top filter bar with presets only | Keep only fixed presets such as `All`, `Needs Review`, or `Failed`. | |
| triage-rail-only filtering | Restrict filtering controls to the left rail. | |
| minimal filtering, rely on grouping | Keep filtering light and depend mainly on grouping. | |

**User's choice:** global top filter bar with combinations  
**Notes:** The user chose the most flexible model so large verdict sets can be narrowed across more than one dimension at once.

---

## Partial-State Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| strong warning banner plus counts | Show prominent partial-state warnings near the header with explicit stale, unresolved, or failed counts. | ✓ |
| header summary only | Keep partial state visible but with low-emphasis summary treatment. | |
| dedicated operational panel | Add a separate panel just for operational status and partial-state detail. | |
| row-level badges only | Show partial state only at group or row level. | |

**User's choice:** strong warning banner plus counts  
**Notes:** The user chose high-visibility operational honesty so unsafe or incomplete runs are obvious before browsing individual verdicts.

---

## Provenance Density

| Option | Description | Selected |
|--------|-------------|----------|
| list and detail both carry provenance | Show lightweight provenance in the browsing list and deeper provenance in the detail panel. | ✓ |
| detail-panel-centered provenance | Keep the list light and defer provenance mostly to the detail view. | |
| header-summary-centered provenance | Emphasize run-level provenance summary over per-row context. | |
| on-demand expandable provenance | Hide extra provenance behind row or group expansion. | |

**User's choice:** list and detail both carry provenance  
**Notes:** The user chose to make provenance useful during both discovery and deep inspection, which fits the chapter/section-centered grouping model.

---

## the agent's Discretion

- Exact wording and visual treatment of the filter controls.
- Exact copy and severity styling for the partial-state warning banner.
- Exact density of row-level provenance text and how it truncates on smaller screens.

## Deferred Ideas

None.
