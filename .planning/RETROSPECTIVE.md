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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | multiple | 8 | Established verification-first GSD flow for a TypeScript story-consistency engine |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 87 Vitest tests + 1 Chromium browser test | Requirement-level verification for 19/19 v1 requirements | Phase-gate docs, audit, and browser inspection checks |

### Top Lessons

1. Keep hard verdict truth, advisory priors, and UI presentation explicitly separated.
2. Archive milestones only after audit artifacts are refreshed against the current phase set.
