# Project Research Summary

**Project:** StoryGraph
**Domain:** story consistency engine / computational narrative reasoning
**Researched:** 2026-04-09
**Confidence:** MEDIUM-HIGH

## Executive Summary

StoryGraph is best approached as a hybrid reasoning system, not as a general writing assistant. The consistent recommendation across logic tooling and recent narrative-consistency research is to keep a canonical representation of characters, states, events, causal links, and world rules, then evaluate that representation with explicit reasoning layers.

The recommended architecture is three-tiered. First, a hard-rule layer evaluates physical, temporal, spatial, causal, and character-state contradictions. Second, a repair layer searches for the smallest missing assumptions or prior events that would restore coherence. Third, a soft-prior layer uses corpus-derived patterns to rank plausible repairs and flag weaker narrative drift without labeling it impossible.

The main project risk is not model quality alone but category collapse: mixing impossible contradictions, missing justifications, and stylistic awkwardness into one opaque verdict. The roadmap should therefore build the canonical schema and hard checker first, then repair reasoning, then corpus priors, and only then author-facing ingestion and visualization.

## Key Findings

### Recommended Stack

The best baseline is a TypeScript-first product stack with PostgreSQL as the canonical operational store, clingo/ASP for hard constraint reasoning, and DuckDB for offline corpus analytics. This gives the project typed schemas, transactional provenance, deterministic rule execution, and lightweight local pattern mining without overcommitting to distributed infrastructure too early.

**Core technologies:**
- **Node.js 24.14.0 LTS**: runtime and orchestration baseline
- **TypeScript 5.9**: typed domain schemas and APIs
- **PostgreSQL 18.3**: canonical source of truth for stories, rules, verdicts, and provenance
- **clingo / ASP**: satisfiability and hard-rule reasoning
- **DuckDB 1.5.1**: local/offline corpus analytics

### Expected Features

The MVP should revolve around explicit representation and auditability, not polish.

**Must have (table stakes):**
- Canonical event/state/world-rule model
- Hard contradiction checking
- Evidence-backed verdicts
- Repair suggestions
- World-rule authoring and overrides

**Should have (competitive):**
- Hybrid hard + soft reasoning
- Minimal repair set generation
- Automatic natural-language structure extraction
- Graph/timeline inspection

**Defer (v2+):**
- Full-manuscript ingestion
- Collaborative review
- Format-specific screenplay/novel/play packs

### Architecture Approach

The system should be layered as `input -> normalization -> canonical model -> hard reasoning -> repair reasoning -> soft prior ranking -> review surface`. The canonical model is the center of gravity. Everything else either produces it, reasons over it, or presents its verdicts.

**Major components:**
1. **Normalizer** — converts natural language into canonical objects and validates them
2. **Canonical store** — persists structured story state, rules, verdicts, and provenance
3. **Hard checker** — evaluates impossible or contradictory transitions
4. **Repair engine** — proposes the smallest missing assumptions needed to restore coherence
5. **Soft prior layer** — uses corpus signals to rank and contextualize weaker drifts

### Critical Pitfalls

1. **Treating corpus frequency as logical truth** — keep priors soft
2. **Letting the LLM be the final judge** — keep verdicts deterministic
3. **No explicit state snapshots** — persist state transitions, not just events
4. **World rules as notes instead of executable constraints** — make them versioned and runnable
5. **Verdicts without provenance** — every judgment must cite evidence

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Canonical Narrative Model
**Rationale:** everything else depends on a stable schema
**Delivers:** entities, events, state transitions, and storage schema
**Addresses:** representation and provenance foundations
**Avoids:** prose-only storage and hidden state drift

### Phase 2: Hard Constraint Engine
**Rationale:** impossible contradictions must be classified before softer critique exists
**Delivers:** physical, temporal, spatial, and character-state checks
**Uses:** clingo/ASP, rule registry, and world-rule overrides
**Implements:** executable rule core

### Phase 3: Repair and Explanation Engine
**Rationale:** diagnosis without repair is too weak for revision workflows
**Delivers:** evidence traces and minimal repair candidate generation

### Phase 4: Corpus and Soft Priors
**Rationale:** pattern priors become useful only after hard logic is stable
**Delivers:** weighted repair ranking and soft drift detection

### Phase 5: Authoring Ingestion and Review APIs
**Rationale:** once the core exists, input ergonomics becomes worth building
**Delivers:** natural-language ingestion and correction workflow

### Phase 6: Visualization and Interactive Analysis
**Rationale:** visualization should sit on top of trusted reasoning artifacts
**Delivers:** timeline/graph inspection of events, states, and violations

### Phase Ordering Rationale

- The canonical schema must precede all reasoning and UI work.
- Hard logic must precede repair logic because repairs depend on diagnosed failures.
- Corpus priors must stay downstream from hard logic to avoid becoming pseudo-laws.
- UI and visualization should not precede a trustworthy reasoning core.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** exact ASP/SMT split, rule authoring DSL, and constraint performance strategy
- **Phase 4:** corpus selection, extraction quality, and weighting methodology
- **Phase 5:** natural-language extraction accuracy and user correction workflow

Phases with standard patterns (skip research-phase):
- **Phase 1:** data modeling and schema design are relatively standard
- **Phase 6:** visualization techniques are standard once the data model is fixed

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core DB/runtime recommendations are supported by official docs |
| Features | MEDIUM | Strongly grounded, but product packaging choices remain open |
| Architecture | HIGH | The layered structure follows the problem shape closely |
| Pitfalls | HIGH | The main failure modes are already clear from the project’s core premise |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- Exact rule language boundary between ASP and any SMT/numeric layer
- Practical benchmark corpus for pattern mining and evaluation
- Best UX for user correction after automatic structure extraction

## Sources

### Primary (HIGH confidence)
- https://nodejs.org/en/about/previous-releases
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html
- https://www.postgresql.org/docs/18/
- https://www.postgresql.org/docs/18/datatype-json.html
- https://potassco.org/
- https://duckdb.org/release_calendar
- https://duckdb.org/docs/lts/clients/python/overview

### Secondary (MEDIUM confidence)
- https://neo4j.com/docs/getting-started/data-modeling/
- https://github.com/pgvector/pgvector

### Tertiary (LOW confidence)
- https://arxiv.org/abs/2503.23512
- https://arxiv.org/abs/2508.09848
- https://arxiv.org/abs/2603.05890

---
*Research completed: 2026-04-09*
*Ready for roadmap: yes*
