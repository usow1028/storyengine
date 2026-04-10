# Phase 1: Canonical Narrative Schema - Research

**Researched:** 2026-04-09
**Domain:** canonical narrative data modeling for a logic-backed story consistency engine
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Canonical `Event` units are state-changing causal units rather than sentence-level fragments or coarse scene-only blocks.
- Abstract events are first-class canonical events when they produce state or rule changes. Examples include betrayal, confession, contract, oath, threat, decision, and identity reveal.
- An event must connect to at least one state change or rule change to qualify as a canonical event.
- `CharacterState` uses a hybrid structure: fixed core slots plus extensible typed attributes.
- Core slots exist to support deterministic checks across stories; special work-specific states are allowed through typed extensions rather than fully freeform graph properties.
- Time modeling is relative-order first, with absolute timestamps attached only when the source material actually supports them.
- Temporal relations should support at least `before`, `after`, `during`, `same-window`, and `unknown`, plus duration/minimum-travel constraints for contradiction checking.
- Space modeling uses place entities with containment hierarchies and optional coordinates or movement constraints.
- Movement plausibility should be judged from place hierarchy and minimum travel-time constraints, not from coordinates alone.
- Rule metadata lives in the operational database, including rule identity, description, scope, priority, activation state, and world affiliation.
- Executable hard rules live in versioned rule files outside the database so solver behavior remains explicit and auditable.
- User-authored world rules are allowed in free natural language, but must be normalized into a validated internal representation before the engine can execute them.
- PostgreSQL is the canonical source of truth for operational story data, rule metadata, verdict records, and provenance.
- Graph-oriented exploration may be added later as a projection/read model, but not as the initial system of record.

### the agent's Discretion
- Exact naming of core state slots, so long as they preserve the fixed-core plus extension model
- Exact schema split between relational columns and `jsonb` extension payloads
- Specific rule-file layout and solver adapter structure, so long as DB metadata and executable rules remain separate

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<research_summary>
## Summary

Phase 1 should not try to solve the full story engine. Its job is to make later reasoning possible. The research points to a strongly normalized operational core: relational records for stable entities and version history, `jsonb` for bounded extensibility, and explicit transition/provenance tables so every future verdict can point back to the exact story revision, event boundary, and rule set used.

The standard approach for systems that mix explicit reasoning with flexible content is not “graph-first everything” and not “blob storage with smart prompts.” It is a typed canonical model with a versioned rule registry, explicit transition boundaries, and a separation between operational truth and derived read models. For StoryGraph that means: PostgreSQL as system of record, rule metadata in DB, executable rules in versioned files, and a schema that makes `state before / event / state after` reconstructable without hidden inference.

**Primary recommendation:** Plan Phase 1 around three concrete deliverables: canonical schemas + IDs, persistence/provenance model, and state snapshot/delta reconstruction.
</research_summary>

<standard_stack>
## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL | 18.3 | Canonical operational store for entities, transitions, rules, and provenance | Mature relational guarantees plus first-class `jsonb` support make it the safest source of truth for mixed structured/flexible data |
| TypeScript | 5.9 | Typed schema definitions and service-layer contracts | Strong static guarantees help keep taxonomy IDs, canonical objects, and transition interfaces stable |
| Zod | current stable | Runtime validation for extracted events, states, and rules | Natural-language-derived structure must be validated before entering the canonical store |
| Node.js | 24.14.0 LTS | Runtime for schema services, migration tools, and orchestration | Stable LTS runtime for a TypeScript-first engine |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Kysely or Drizzle | current stable | Type-safe SQL access and migrations | Use if you want explicit SQL control without a heavyweight ORM |
| pgvector | 0.8.x | Retrieval of similar examples, repairs, and pattern priors | Use later for soft-prior and case-retrieval layers, not as the core of Phase 1 |
| clingo / ASP | 5.x | Future executable rule engine target | Not a Phase 1 persistence dependency, but Phase 1 schema should prepare for it |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PostgreSQL as source of truth | Neo4j as primary store | Better graph traversal, weaker fit for transactional operational truth and version-heavy provenance |
| Query builder + migrations | Heavy ORM | Faster scaffolding, but tends to hide exact relational control needed for explicit reasoning systems |
| `jsonb` extensions | Fully open property graph | More flexible, but easier to lose stable reasoning axes and query discipline |

**Installation:**
```bash
npm install typescript zod postgres kysely
npm install -D tsx vitest @types/node
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```text
src/
├── domain/            # canonical types, enums, IDs, taxonomy definitions
├── storage/           # PostgreSQL schema, queries, migrations
├── normalization/     # future NL->canonical validation path
├── rules/             # metadata loaders and executable rule registry adapters
└── services/          # story revision, snapshot rebuild, provenance APIs
```

### Pattern 1: Revisioned Canonical Core
**What:** Treat each story edit as a versioned canonical revision rather than mutating the world state invisibly.
**When to use:** Always, if later verdicts need reproducibility and diffing.
**Example:**
```typescript
type StoryRevision = {
  storyId: string;
  revisionId: string;
  basedOnRevisionId?: string;
  createdAt: string;
  sourceKind: "manual" | "imported" | "normalized";
};
```

### Pattern 2: Stable Core Slots + Typed Extensions
**What:** Keep a fixed set of reasoning-critical slots while allowing bounded extensibility for work-specific states.
**When to use:** When deterministic checks and domain flexibility must coexist.
**Example:**
```typescript
type CharacterStateCore = {
  locationId?: string;
  aliveStatus: "alive" | "dead" | "unknown";
  goals: string[];
  loyalties: string[];
  knownFacts: string[];
};

type CharacterStateExtension = {
  key: string;
  valueType: "string" | "number" | "boolean" | "entity_ref" | "enum";
  value: unknown;
};
```

### Pattern 3: Event Boundary + Delta Model
**What:** Store explicit event boundaries and state deltas so the system can reconstruct before/after state.
**When to use:** When future contradiction checks depend on exact transition points.
**Example:**
```typescript
type EventRecord = {
  eventId: string;
  storyRevisionId: string;
  eventType: string;
  abstract: boolean;
  actorIds: string[];
  timeRelationIds: string[];
  placeId?: string;
};
```

### Anti-Patterns to Avoid
- **Graph-first source of truth:** tempting for narratives, but weakens explicit version/provenance control early.
- **Narrative blob + inferred state:** makes later contradiction debugging and replay difficult.
- **User-authored free rules stored as raw text only:** breaks future execution and auditing.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Flexible structured attributes | Ad hoc text parsing everywhere | `jsonb` + typed validation + explicit extension schema | Keeps flexibility bounded and queryable |
| Version history | Manual backup tables with no lineage | Explicit revision tables and parent revision links | Needed for verdict replay and diff |
| Provenance | Free-text notes about where data came from | Source span / source object references per canonical entity | Makes verdict explanation possible later |

**Key insight:** Phase 1 should hand-roll the narrative domain model, not generic database primitives PostgreSQL already solves well.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Too-Abstract Core Slots
**What goes wrong:** States become generic labels that cannot support future hard checks.
**Why it happens:** Teams over-optimize for flexibility before deciding what must be checkable.
**How to avoid:** Lock a small mandatory core for location, vitality, knowledge, goals, loyalty/relationship, resources, and conditions.
**Warning signs:** The same contradiction requires reading prose notes instead of querying canonical state.

### Pitfall 2: `jsonb` Everywhere
**What goes wrong:** Query logic and migrations become fragile because stable concepts are hidden in blobs.
**Why it happens:** `jsonb` feels faster during setup.
**How to avoid:** Normalize stable identities and relations; reserve `jsonb` for bounded extension payloads and annotations.
**Warning signs:** Core queries require repeated JSON path extraction for routine checks.

### Pitfall 3: No Provenance at Entity/Event Granularity
**What goes wrong:** Later verdicts cannot explain which source sentence, import step, or rule normalization produced a canonical fact.
**Why it happens:** Provenance is deferred as “metadata for later.”
**How to avoid:** Include provenance references at creation time for canonical events, states, and rules.
**Warning signs:** Analysts can see a wrong fact but cannot trace where it entered the model.
</common_pitfalls>

<code_examples>
## Code Examples

Verified patterns from official sources:

### PostgreSQL JSONB for bounded extensibility
```sql
-- Source: PostgreSQL 18 JSON Types documentation
create table character_state_extensions (
  extension_id uuid primary key,
  state_revision_id uuid not null,
  key text not null,
  value jsonb not null
);
```

### Story revision lineage
```typescript
// Canonical service-layer pattern derived from revisioned content systems
type RevisionLink = {
  revisionId: string;
  previousRevisionId?: string;
  createdAt: string;
};
```

### Place hierarchy record
```typescript
type PlaceRecord = {
  placeId: string;
  name: string;
  parentPlaceId?: string;
  geo?: { lat: number; lng: number };
  movementClass?: "normal" | "restricted" | "fictional";
};
```
</code_examples>

<sota_updates>
## State of the Art (2024-2026)

What's changed recently:

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prompt-only long-form judgment | Hybrid extraction + explicit state tracking + checker layers | 2024-2026 | Story consistency systems increasingly separate fluent generation from deterministic checking |
| “Graph DB solves narrative” assumption | Operational relational core + derived graph views | 2024-2026 | Better control over provenance, revisioning, and transactional writes |
| Fully rigid schemas | Stable core + bounded extension patterns | 2024-2026 | More practical for mixed symbolic and AI-assisted systems |

**New tools/patterns to consider:**
- Revision-aware canonical stores: useful because verdict replay and repair diffs matter for writing workflows
- Mixed symbolic/LLM boundaries: use AI to normalize and explain, not to replace the operational truth model

**Deprecated/outdated:**
- Treating free natural-language notes as sufficient system memory
- Assuming corpus frequency can define canonical truth without a stable schema
</sota_updates>

<open_questions>
## Open Questions

1. **Exact mandatory core slot list**
   - What we know: the core must support future checks for time, space, causality, behavior, and provenance
   - What's unclear: the final minimal slot set and naming
   - Recommendation: settle this in Plan 01-01 with a typed taxonomy decision and migration sketch

2. **Relational table boundaries vs `jsonb` payload boundaries**
   - What we know: stable entities and transitions should be relational; flexible work-specific state should be bounded
   - What's unclear: which extension classes deserve their own tables from day one
   - Recommendation: decide using query frequency and verification importance, not stylistic preference
</open_questions>

<validation_architecture>
## Validation Architecture

Phase 1 should establish automated schema-level verification from the start. The recommended baseline is Vitest with fast structural checks over canonical type definitions, migration artifacts, and state reconstruction services.

Key checks to require during execution:
- schema definitions compile and export the expected canonical types
- storage layer can persist and reload minimal story/entity/event fixtures
- state reconstruction tests prove `before event` and `after event` snapshots are reproducible
- provenance records are present for created canonical entities

Validation should start lightweight in Wave 0 rather than waiting for the full engine:
- install Vitest and baseline test config
- add canonical fixture builders for story/entity/event/state records
- create targeted tests for schema invariants and snapshot reconstruction
</validation_architecture>

<sources>
## Sources

### Primary (HIGH confidence)
- https://www.postgresql.org/docs/18/datatype-json.html — `jsonb` behavior and indexing implications
- https://www.postgresql.org/docs/18/functions-json.html — query patterns for bounded extensibility
- https://www.postgresql.org/docs/18/ddl-inherit.html — reference point for inheritance tradeoffs (ultimately not recommended as the main extension mechanism here)
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html — current TypeScript baseline
- https://nodejs.org/en/about/previous-releases — current Node LTS baseline

### Secondary (MEDIUM confidence)
- https://neo4j.com/docs/getting-started/data-modeling/ — useful comparison point for graph projection vs source-of-truth design
- https://potassco.org/ — confirms future executable-rule target and why schema should prepare for explicit rule engines

### Tertiary (LOW confidence - needs validation)
- https://arxiv.org/abs/2503.23512 — research signal for repair-oriented narrative consistency systems
- https://arxiv.org/abs/2603.05890 — research signal for long-context story consistency failure types
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: PostgreSQL-backed canonical modeling for symbolic narrative reasoning
- Ecosystem: typed schema design, provenance/versioning, extension modeling
- Patterns: revision lineage, stable core slots, event deltas, rule metadata separation
- Pitfalls: schema over-flexibility, provenance omission, graph-first overreach

**Confidence breakdown:**
- Standard stack: HIGH - based on official documentation and a clear problem fit
- Architecture: HIGH - strongly aligned with downstream hard-rule and provenance needs
- Pitfalls: HIGH - directly tied to the project’s explicit goals
- Code examples: MEDIUM - illustrative, but final code should be adapted during planning

**Research date:** 2026-04-09
**Valid until:** 2026-05-09
</metadata>

---
*Phase: 01-canonical-narrative-schema*
*Research completed: 2026-04-09*
*Ready for planning: yes*
