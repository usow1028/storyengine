# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-04-10
**Phases:** 8 | **Plans:** 25 | **Sessions:** multiple GSD execution sessions

### What Was Built

- Canonical story graph model with explicit entities, state boundaries, events, world rules, provenance, verdicts, and persistence.
- Deterministic hard constraint engine covering physical, temporal, causal, and character-state contradictions.
- Evidence, repair, rerun, and verdict-diff reasoning for explainable consistency results.
- Corpus-derived soft-prior pipeline and runtime advisory integration that does not mutate hard verdict truth.
- Natural-language ingestion/review/check flow and structured browser inspection console for verdict runs.

### What Worked

- Goal-backward verification artifacts kept requirement claims tied to concrete tests, routes, services, and storage behavior.
- The Phase 7/8 split preserved hard/soft separation: priors can rerank and explain plausibility without becoming deterministic law.
- Browser verification caught integration risk at the served-route boundary instead of only testing React components in isolation.

### What Was Inefficient

- The original milestone audit became stale after gap-closure phases and had to be refreshed after Phase 7/8.
- Phase 06 initially lacked its own `VERIFICATION.md` and finalized `VALIDATION.md`, which created a milestone-archive bookkeeping gap even though product integration was complete.
- ROADMAP progress updates needed manual correction after the plan count changed from the early 2-plan sketch to the final 6-plan Phase 8 split.

### Patterns Established

- Keep deterministic verdict output authoritative; attach soft-prior output only as advisory evidence and repair ranking.
- Persist inspection snapshots at verdict-run time so UI/API inspection does not need raw storage spelunking or live recomputation.
- Treat `VERIFICATION.md` and `VALIDATION.md` as required phase-gate artifacts, even for documentation or audit-closure phases.

### Key Lessons

1. Milestone audits should be rerun after every gap-closure phase before archiving.
2. Requirement traceability should follow verified evidence, not summary frontmatter alone.
3. Served-boundary browser tests are worth the overhead for UI/API integration phases.
4. Repair ordering must use the same ranked source that the advisory layer exposes, or UI labels can silently contradict runtime scoring.

### Cost Observations

- Model mix: primarily frontier agent execution with specialized GSD verifier, reviewer, integration checker, and executor agents.
- Sessions: multi-session milestone execution.
- Notable: The highest rework came from planning-artifact drift, not implementation failures.

---

## Milestone: v1.1 — Draft Scale

**Shipped:** 2026-04-11
**Phases:** 4 | **Plans:** 12 | **Sessions:** multiple GSD execution sessions

### What Was Built

- Chapter-scale draft ingestion with ordered documents, revisions, sections, segments, scopes, and LF-normalized source references.
- Incremental extraction, retry, correction, approval reset, and mixed-state review handling across many draft segments.
- Scoped deterministic checks and revision or run diffs with explicit comparison scope identity and finding-level change labels.
- Large-run inspection payload enrichment with operational summaries, grouping metadata, provenance summaries, and source-context detail.
- Grouped and filterable browser inspection with strong mixed-state warning visibility and end-to-end regression coverage.

### What Worked

- Keeping every v1.1 contract additive prevented draft-scale growth from breaking earlier ingestion and inspection consumers.
- The fixed verdict-kind outer rail survived the move to grouped and filterable large-run browsing because UI grouping stayed subordinate to deterministic result structure.
- Persisting operational summaries at check time kept partial-state honesty tied to the inspected run instead of drifting with later session changes.

### What Was Inefficient

- The milestone archive gate was reached without a fresh `v1.1-MILESTONE-AUDIT.md`, so archival had to proceed on explicit operator intent rather than a clean audit artifact.
- `STATE.md` template drift forced partial manual cleanup because some GSD CLI updates assumed fields that this repo no longer carries.
- `gsd-tools milestone complete` added a shipped milestone entry without removing the older active block, so `MILESTONES.md` needed manual deduplication.

### Patterns Established

- Extend inspection and draft-scale contracts additively; do not replace stable DTOs just because richer metadata is needed.
- Persist operational or review-state summaries at the same time as deterministic run artifacts, then render them directly in inspection.
- Use service, API, UI, and browser checks together for inspection phases; large-run honesty is not proven by unit tests alone.

### Key Lessons

1. Re-run or create the milestone audit immediately before archival so the ship gate is evidence-complete, not just implementation-complete.
2. Keep `STATE.md` aligned with current GSD field expectations, or archive and transition workflows will degrade into partial updates.
3. Auto-generated milestone ledgers still need human cleanup when a project keeps a preexisting `Active` block in `MILESTONES.md`.
4. Grouping and filtering features are safest when they rearrange presentation only and never redefine deterministic verdict identity.

### Cost Observations

- Model mix: primarily frontier agent execution with GSD executor-style planning, verification, and review flows.
- Sessions: multi-session milestone execution across phases 09-12.
- Notable: most rework came from planning-artifact closure and archival cleanup rather than from core product regressions.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | multiple | 8 | Established verification-first GSD flow for a TypeScript story-consistency engine |
| v1.1 | multiple | 4 | Extended the same verification-first flow to draft-scale ingestion, scoped checks, diffing, and browser inspection guardrails |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 87 Vitest tests + 1 Chromium browser test | Requirement-level verification for 19/19 v1 requirements | Phase-gate docs, audit, and browser inspection checks |
| v1.1 | 100+ targeted and suite tests plus Chromium inspection coverage | Requirement-level verification for 11/11 v1.1 requirements | Draft-scale phase-gate docs, grouped inspection coverage, and milestone archive artifacts |

### Top Lessons

1. Keep hard verdict truth, advisory priors, and UI presentation explicitly separated.
2. Archive milestones only after audit artifacts are refreshed against the current phase set.
