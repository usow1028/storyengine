<!-- GSD:project-start source:PROJECT.md -->
## Project

**StoryGraph**

StoryGraph is a story-consistency engine project that treats narrative as a system that can be modeled, checked, and repaired rather than a purely intuitive writing act. Its first goal is not style generation, but an explainable consistency core that represents character state, events, and world rules, then evaluates whether a story remains causally, physically, temporally, and behaviorally coherent.

The project is for writers, aspiring writers, and narrative-system builders who want to inspect story structure in a way that resembles engineering analysis. It assumes that many narrative failures can be expressed as pattern mismatches, missing causes, broken state transitions, or undeclared world-rule exceptions.

**Core Value:** Writers must be able to see exactly why a story is coherent or incoherent, and what explanation or prior condition would repair it.

### Constraints

- **Explainability**: Every judgment must be traceable to explicit states, events, rules, or missing assumptions — black-box scoring is insufficient.
- **Default Physics**: The baseline world model follows real-world physical constraints unless user-defined world rules extend or override them.
- **Hybrid Architecture**: Frontier LLMs may assist with extraction, interpretation, and repair suggestions, but deterministic consistency judgment must remain logic-led.
- **Progressive Input**: Users should be able to write freely in natural language, but the engine must normalize that input into structured internal representations.
- **Phased Scope**: The first milestone should prioritize rule systems, schemas, taxonomies, and a working consistency core before ambitious UI or visualization work.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | 24.14.0 LTS | Primary runtime for product logic, API, and orchestration | Active LTS, broad ecosystem support, and strong fit for a TypeScript-first domain model and tooling layer |
| TypeScript | 5.9 | Typed domain model for events, states, rules, verdicts, and repair objects | Strong static typing is valuable when rule schemas, taxonomy IDs, and state transitions must remain explicit and refactor-safe |
| PostgreSQL | 18.3 | Canonical source of truth for stories, rules, violations, and repair records | `jsonb`, SQL/JSON functions, strong indexing, and transactional guarantees make it the best base store for mixed relational + structured rule data |
| clingo / ASP | 5.x | Hard-rule reasoning, satisfiability checks, minimal repair candidates | Answer Set Programming fits combinatorial rule checking, explicit constraints, and minimal explanation search better than prompt-only reasoning |
| DuckDB | 1.5.1 | Offline corpus mining and pattern analysis over extracted event datasets | Fast local analytics and file-native workflows make it ideal for deriving soft priors and pattern statistics from large narrative corpora |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pgvector | 0.8.x | Embedding-based retrieval of similar violations, repair examples, and narrative patterns | Use when searching analogous story cases or clustering corpus-derived inconsistency patterns |
| Zod | current stable | Runtime validation for structured objects extracted from natural language | Use at every system boundary where LLM output is normalized into canonical schemas |
| Fastify | current stable | Lightweight API layer for ingestion, validation, and verdict queries | Use once the engine is exposed as a local service or web product |
| Cytoscape.js or React Flow | current stable | Graph or timeline visualization of events, states, and violations | Use after the core reasoning layer is reliable enough to visualize confidently |
| Python 3.13 (optional) | current stable | Corpus ingestion and research scripts alongside DuckDB notebooks/jobs | Use if corpus mining becomes deep enough that Python data tooling outpaces a TypeScript-only workflow |
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest | Unit and property-style testing | Useful for testing rule packs, state transitions, and regression fixtures quickly |
| ESLint + TypeScript strict mode | Structural quality guardrails | Important because subtle schema drift can invalidate reasoning results |
| pnpm | Workspace package management | Good fit if the project splits into `engine`, `api`, `ui`, and `research` packages |
## Installation
# Core app/runtime
# Visualization and retrieval
# Dev dependencies
# Infrastructure outside npm
# - PostgreSQL 18.x
# - clingo 5.x
# - DuckDB 1.5.x
# - pgvector extension for PostgreSQL
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| PostgreSQL | Neo4j as primary store | Use Neo4j as the primary store only if graph traversal dominates everything and strict transactional relational traces matter less |
| clingo / ASP | Z3 / SMT | Use SMT when numeric optimization, distances, scheduling, or weighted arithmetic constraints dominate the rule set |
| TypeScript-first app | Python-first app | Use Python-first only if corpus mining and research notebooks dominate product/API work for a long time |
| DuckDB for analytics | BigQuery / warehouse stack | Use a warehouse only after corpus scale or collaboration needs exceed local/offline analysis workflows |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Pure prompt-based verdicting | Non-deterministic, hard to audit, and unstable under small wording changes | Keep LLMs in extraction and explanation support, not as the final judge |
| Single opaque "consistency score" as the core model | Collapses different failure types into a non-actionable output | Store typed violations and compute score only as a derived summary |
| Document-only storage with no normalized schema | Makes state transitions, provenance, and re-checking unreliable | Persist canonical entities, events, rule packs, and verdict records |
| Frequency-derived hard rules from corpus data | Common patterns are not the same as logical validity | Treat corpus patterns as soft priors, never as law |
## Stack Patterns by Variant
- Use TypeScript + PostgreSQL + clingo + DuckDB
- Because it keeps the core logic auditable before UI complexity arrives
- Add Python for ingestion and experimental notebooks
- Because DuckDB and data-science tooling can accelerate pattern extraction without forcing the whole product into Python
- Add a graph projection store or graph visualization layer
- Because reasoning artifacts become easier to inspect when events and states are navigable as connected structures
## Version Compatibility
| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Node.js 24.14.0 | TypeScript 5.9 | A stable production baseline for a strict TypeScript project |
| PostgreSQL 18.3 | pgvector 0.8.x | Good fit for hybrid structured + semantic retrieval storage |
| DuckDB 1.5.x | Python 3.9+ | Useful for corpus mining scripts and local analysis |
## Sources
- https://nodejs.org/en/about/previous-releases — verified current Active LTS release line
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html — verified current TypeScript release notes
- https://www.postgresql.org/docs/18/ — verified current supported PostgreSQL line
- https://www.postgresql.org/docs/18/datatype-json.html — verified `jsonb` recommendation and indexing support
- https://www.postgresql.org/docs/18/functions-json.html — verified JSON query/operator support
- https://potassco.org/ — official ASP/clingo documentation hub
- https://duckdb.org/release_calendar — verified current release cadence
- https://duckdb.org/docs/lts/clients/python/overview — verified DuckDB client versioning and local analytics fit
- https://github.com/pgvector/pgvector — official pgvector project
- https://neo4j.com/docs/getting-started/data-modeling/ — official graph modeling reference
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
