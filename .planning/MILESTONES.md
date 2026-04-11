# Milestones

## v1.1 Draft Scale (Shipped: 2026-04-11)

**Phases completed:** 4 phases, 12 plans, 34 tasks

**Archives:** [Roadmap](milestones/v1.1-ROADMAP.md) · [Requirements](milestones/v1.1-REQUIREMENTS.md)

**Key accomplishments:**

- Chapter-scale draft documents, revisions, sections, segments, and source references now persist additively without breaking the legacy ingestion flow.
- Incremental extraction, retry, correction, approval reset, and mixed-state visibility now work safely per segment without corrupting canonical state.
- Scoped consistency checks and revision or run diffs now preserve deterministic hard verdict truth while surfacing finding-level scope labels.
- Large-run inspection now supports grouped and filterable verdict browsing while keeping verdict-kind triage as the fixed outer frame.
- Operational warning counts, provenance-backed row or detail context, and browser verification now keep partial draft work visibly honest.

---

## v1.0 MVP (Shipped: 2026-04-10)

**Phases completed:** 8 phases, 25 plans, 65 tasks

**Archives:** [Roadmap](milestones/v1.0-ROADMAP.md) · [Requirements](milestones/v1.0-REQUIREMENTS.md) · [Audit](milestones/v1.0-MILESTONE-AUDIT.md)

**Key accomplishments:**

- TypeScript and Zod canonical schemas for entities, state boundaries, events, world rules, and verdict taxonomies with executable invariants
- PostgreSQL canonical schema, provenance-aware repositories, and pg-mem round-trip tests for story revisions, rules, and verdicts
- Boundary query primitives and snapshot reconstruction services that answer state before and after a chosen canonical event
- Execution-ready rule/verdict contracts and five checker families for the first deterministic hard-constraint layer
- Deterministic rule activation, representative verdict aggregation, and end-to-end hard-engine orchestration
- Centralized hard-constraint fixtures, deterministic regression suites, and a stable engine verification command
- Structured verdict evidence snapshots, deterministic explanation rendering, and explained verdict materialization over Phase 2 findings
- Reason-scoped typed repairs, deterministic ranking, and provenance-preserving deduplication over local failing paths
- Run-aware verdict persistence, stable finding fingerprints, and immediate-previous-run diffing for reasoning history
- Versioned baseline and genre prior snapshots built from canonicalized corpus transitions with deterministic export artifacts
- Layer-aware soft drift scoring and repair plausibility reranking built on exported baseline and genre prior snapshots
- Advisory ingestion sessions with deterministic draft segmentation, normalized extraction candidates, and Fastify submit/extract/read endpoints
- Structured review patches, approval-gated canonical promotion, and explicit manual check controls for ingestion sessions
- Phase 01-03 verification artifacts with explicit requirement-to-evidence mapping for canonical modeling, hard constraints, and reasoning history
- Phase 04-05 verification artifacts backfilled with honest requirement classification and traceability reconciled to verification truth
- Milestone audit rerun now classifies completed work from verification artifacts and routes the remaining blocker to Phase 7
- Status-wrapped soft-prior advisory evaluation wired into verdict runs after hard verdict persistence
- Manual ingestion checks now carry a separate softPrior advisory block through service and Fastify response contracts without letting request payloads configure prior snapshots.
- Fastify ingestion check E2E now proves available soft-prior advisories while persisted hard verdict data stays invariant.
- React/Vite inspection console bootstrap with run-scoped API fetch boundary and Playwright browser-test configuration
- Sanitized verdict-run inspection snapshots with repair candidates and soft-prior advisory data persisted at check time
- Run-scoped inspection JSON for grouped verdict triage, traceable detail, repair suggestions, advisory signal, and previous-run diff
- A browser inspection console with grouped verdict triage, deterministic detail, evidence summaries, and repair suggestions
- Selected verdict details now expose timeline-first traceability and a separate advisory pattern signal
- The inspection surface is now served by Fastify and verified in Chromium against a seeded real API run

---
