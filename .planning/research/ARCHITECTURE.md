# Architecture Research

**Domain:** story consistency engine / computational narrative reasoning
**Researched:** 2026-04-09
**Confidence:** MEDIUM-HIGH

## Standard Architecture

### System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                  Authoring / Input Layer                    │
├─────────────────────────────────────────────────────────────┤
│  Natural language input   Structured cards   Rule editor    │
└──────────────┬─────────────────────┬────────────────────────┘
               │                     │
┌──────────────┴─────────────────────┴────────────────────────┐
│            Extraction / Normalization Layer                │
├─────────────────────────────────────────────────────────────┤
│  entity extraction   event parsing   schema validation      │
└──────────────┬─────────────────────┬────────────────────────┘
               │                     │
┌──────────────┴─────────────────────┴────────────────────────┐
│               Canonical Narrative Model                     │
├─────────────────────────────────────────────────────────────┤
│  characters   states   events   causal links   world rules  │
│  violations   repairs  provenance                              │
└──────────────┬─────────────────────┬────────────────────────┘
               │                     │
┌──────────────┴───────────────┐   ┌──────────────────────────┐
│   Symbolic Reasoning Layer   │   │   Statistical Layer      │
├──────────────────────────────┤   ├──────────────────────────┤
│ hard constraints / ASP / SMT │   │ corpus priors / retrieval│
│ temporal + causal checking   │   │ soft drift ranking       │
└──────────────┬───────────────┘   └──────────────┬───────────┘
               │                                  │
┌──────────────┴──────────────────────────────────┴───────────┐
│                 Verdict / Review Layer                      │
├─────────────────────────────────────────────────────────────┤
│ hard contradiction   repairable gap   soft drift   coherent │
│ evidence trace       repair candidates  inspection views    │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Input/authoring | Accept synopsis, scene descriptions, or rule edits | API + simple text UI or web form |
| Normalizer | Convert raw prose into canonical objects | LLM-assisted extraction + schema validation |
| Canonical store | Persist events, states, rules, verdicts, and provenance | PostgreSQL with relational tables + `jsonb` |
| Hard reasoning engine | Evaluate satisfiability, constraints, and direct contradictions | ASP/clingo first, optional SMT for numeric cases |
| Repair engine | Generate minimal assumptions or prior events needed to restore coherence | Abductive reasoning over the same canonical model |
| Soft prior engine | Rank likely repairs and detect softer narrative drift | Corpus statistics + retrieval + weighted rules |
| Review surface | Present verdicts, evidence, and corrections | API-first, later timeline/graph UI |

## Recommended Project Structure

```text
src/
├── domain/             # Canonical schemas, enums, taxonomy IDs
│   ├── character/      # Character state and relation models
│   ├── event/          # Event and transition models
│   ├── rule/           # World rule and verdict models
│   └── ids.ts          # Stable REQ / violation / rule identifiers
├── ingest/             # Natural language extraction and normalization
├── reasoning/
│   ├── hard/           # Constraint encoding and hard checks
│   ├── repair/         # Abductive repair generation
│   ├── soft/           # Pattern priors and ranking
│   └── explain/        # Evidence trace formatting
├── storage/            # Postgres, DuckDB, and retrieval adapters
├── api/                # HTTP or RPC surface
├── ui/                 # Later inspection UI
└── tests/              # Fixtures for rules, stories, and regressions

rules/
├── hard/               # Executable logic rules
├── soft/               # Weighted priors or templates
└── taxonomies/         # Violation and repair taxonomies

corpus/
├── raw/                # Imported public/reference narratives
├── extracted/          # Derived event/state datasets
└── analytics/          # DuckDB queries and reports
```

### Structure Rationale

- **`domain/`**: keeps the engine’s language explicit and independent from transport or UI code.
- **`reasoning/`**: separates hard contradictions, repairs, and soft priors so they do not collapse into one opaque score.
- **`rules/`**: stores executable logic and taxonomies as versioned assets instead of burying them inside prompt text.
- **`corpus/`**: keeps pattern mining reproducible and distinct from online verdict serving.

## Architectural Patterns

### Pattern 1: State-Transition Narrative Model

**What:** Stories are represented as state snapshots and transitions rather than as prose blobs.
**When to use:** Always, if the goal is consistency judgment instead of pure generation.
**Trade-offs:** More modeling effort up front, but much better auditability and rerunnability.

**Example:**
```typescript
type Event = {
  id: string;
  actorIds: string[];
  timeRef: string;
  locationId: string;
  preconditions: string[];
  effects: string[];
};
```

### Pattern 2: Hybrid Symbolic + LLM Pipeline

**What:** Use LLMs to extract or explain, but keep final judgment in explicit logic.
**When to use:** Whenever users want natural-language authoring without sacrificing deterministic checks.
**Trade-offs:** Requires careful boundary validation; otherwise extraction mistakes contaminate reasoning.

**Example:**
```typescript
rawText -> llmExtraction -> zodValidation -> canonicalModel -> symbolicCheck
```

### Pattern 3: Dual-Layer Verdicting

**What:** Hard contradictions and soft narrative drift are handled by different engines.
**When to use:** When “impossible” and “unlikely/awkward” must be separated cleanly.
**Trade-offs:** More components, but avoids the common anti-pattern of mixing logic failure with stylistic preference.

## Data Flow

### Request Flow

```text
[Author Input]
    ↓
[Normalizer] → [Schema Validation] → [Canonical Store]
    ↓                              ↓
[Hard Checker] → [Repair Engine] → [Soft Prior Layer]
    ↓
[Verdict + Evidence + Suggested Fixes]
```

### State Management

```text
[Story Draft]
    ↓
[Canonical model revision]
    ↓
[Versioned verdict run]
    ↓
[Violation and repair records]
```

### Key Data Flows

1. **Authoring flow:** prose or scene note → extracted objects → user correction → stored canonical model.
2. **Reasoning flow:** canonical model → hard-rule check → repair generation → soft-prior ranking.
3. **Research flow:** corpus text → extracted event/state dataset → DuckDB analysis → weighted priors and rule candidates.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k stories/projects | Single service + PostgreSQL + local DuckDB is sufficient |
| 1k-100k stories/projects | Split extraction jobs from verdict serving, add async queues and caching |
| 100k+ stories/projects | Separate corpus analytics, retrieval, and serving layers; consider graph projection and job orchestration |

### Scaling Priorities

1. **First bottleneck:** extraction and re-check throughput — solve with queued normalization and cached canonical revisions.
2. **Second bottleneck:** soft-prior retrieval and corpus analytics — solve with precomputed embeddings and offline batch pipelines.

## Anti-Patterns

### Anti-Pattern 1: Prompt-As-Architecture

**What people do:** Put all story judgment into one giant LLM prompt.
**Why it's wrong:** Hard to reproduce, hard to test, and impossible to audit cleanly.
**Do this instead:** Persist canonical objects and run explicit rule packs against them.

### Anti-Pattern 2: Prose-Only Storage

**What people do:** Store just the manuscript or synopsis and infer everything on the fly.
**Why it's wrong:** Each run can disagree with previous runs, and provenance disappears.
**Do this instead:** Version the normalized representation and tie each verdict to that version.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| LLM provider | structured extraction + explanation assistance | Keep post-validation mandatory |
| PostgreSQL | canonical operational store | Use strong schema plus `jsonb` only where flexibility is needed |
| DuckDB | offline analytics | Best for batch corpus mining, not primary transactional serving |
| Optional graph projection | read-oriented exploration | Add only after canonical schema stabilizes |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `ingest ↔ domain` | validated typed objects | No raw prompt text should cross this boundary unvalidated |
| `domain ↔ reasoning` | canonical model snapshot | Reasoning should operate on stable, versioned inputs |
| `reasoning ↔ ui` | verdict DTOs with evidence | UI should not recompute logic itself |

## Sources

- https://www.postgresql.org/docs/18/datatype-json.html
- https://neo4j.com/docs/getting-started/data-modeling/
- https://potassco.org/
- https://arxiv.org/abs/2503.23512
- https://arxiv.org/abs/2603.05890

---
*Architecture research for: story consistency engine*
*Researched: 2026-04-09*
