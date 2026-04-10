# Phase 8: Interactive Inspection Surface - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 08-interactive-inspection-surface
**Areas discussed:** First inspection surface form, Initial information architecture, Evidence display depth, Timeline or graph representation, Repair and soft-drift presentation

---

## First Inspection Surface Form

| Option | Description | Selected |
|--------|-------------|----------|
| Inspection API + browser-readable HTML endpoint | Fastify provides structured API and human-readable HTML without adding a frontend stack. | |
| API-only structured response | Smallest implementation, but weak evidence for a structured analysis view. | |
| Minimal frontend shell | Adds a small browser UI surface suitable for real inspection and browser verification. | ✓ |

**User's choice:** Minimal frontend shell
**Notes:** The user selected option 3. Phase 8 should introduce a minimal frontend shell rather than staying API-only or Fastify HTML-only.

---

## Initial Information Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Verdict kind triage list | Group by `Hard Contradiction`, `Repairable Gap`, `Soft Drift`, and `Consistent` first. | ✓ |
| Event timeline first | Present story event order first, with verdicts attached to events. | |
| Run history / diff first | Start from latest check run and previous-run changes. | |

**User's choice:** Verdict kind triage list
**Notes:** The first screen should group results by verdict kind, then let the user drill into evidence/timeline/detail.

---

## Evidence Display Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Summary plus expandable detail | Concise default evidence with expandable traceability fields. | ✓ |
| Full evidence immediately | Maximum transparency but heavy UI density. | |
| Writer-friendly summary first | Most approachable, but weaker traceability by default. | |

**User's choice:** Summary plus expandable detail
**Notes:** Default detail should show concise reason, related event/state/rule summaries, and repair direction; expanded sections expose finding IDs, reason codes, conflict paths, missing premises, and supporting findings.

---

## Timeline or Graph Representation

| Option | Description | Selected |
|--------|-------------|----------|
| Left verdict list plus right event timeline/details | Split-view inspection anchored by verdict triage. | ✓ |
| Full-screen event timeline first | Stronger story-flow view, but weaker triage focus. | |
| Node graph first | Powerful but too large for the first inspection surface. | |

**User's choice:** Left verdict list plus right event timeline/details
**Notes:** The UI should use a split view: verdict triage list on the left, selected verdict detail and related event order on the right. Full graph-first visualization is deferred.

---

## Repair and Soft-Drift Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Repair suggestions in hard detail, soft prior as separate advisory band | Keeps repair context near the verdict while preserving hard/soft separation. | ✓ |
| Unified suggestions area | Easier to scan but risks mixing hard repairs with soft plausibility. | |
| Dedicated Soft Drift tab/panel | Rich soft-prior exploration but more navigation for Phase 8. | |

**User's choice:** Repair suggestions in hard detail; soft prior as separate advisory band
**Notes:** Repair candidates stay attached to the relevant verdict detail. Soft-prior/soft-drift output appears as a visually and semantically separate advisory band.

---

## the agent's Discretion

- Exact minimal frontend stack and build tooling.
- Exact route names and component names.
- Exact breakpoint and layout mechanics for the split view.
- Whether run history/diff appears as a secondary panel, badge, or expandable section.

## Deferred Ideas

- Full node-graph-first visualization.
- Raw prior pattern browsing and similar-case corpus exploration.
- Automatic story repair or applying fixes from the UI.
- Full design-system expansion, collaboration, export, and manuscript-scale navigation.
