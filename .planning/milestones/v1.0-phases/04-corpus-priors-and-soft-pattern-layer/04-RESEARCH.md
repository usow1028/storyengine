# Phase 4: Corpus Priors and Soft Pattern Layer - Research

**Researched:** 2026-04-09
**Domain:** Offline corpus normalization, DuckDB-backed prior builds, and soft-prior scoring that augments repair ranking without weakening hard logic
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Soft priors use a layered corpus strategy with a shared human-story baseline plus separate genre-specific corpora.
- **D-02:** Phase 4 corpus intake prioritizes completed works that are commercially or critically validated.
- **D-03:** Genre labeling must support weighted multi-genre assignments and separate world-rule profiles.
- **D-04:** Phase 4 implements baseline and genre priors only; project/user priors are deferred.
- **D-05:** The reusable prior unit is `event transition + state transition`.
- **D-06:** Corpus normalization must extract canonical events, state transitions, and world-rule exceptions.
- **D-07:** Reality-default vs override behavior must remain explicit in the prior layer.
- **D-08:** Soft priors use conditional probabilities with hierarchical backoff.
- **D-09:** Prior scoring records separated contribution by layer rather than one opaque score.
- **D-10:** Soft output is decomposed into drift-type scores plus the dominant prior layer.
- **D-11:** Prior application uses dynamic thresholds informed by confidence and sample size.
- **D-12:** Positive priors and drift priors are modeled separately.
- **D-13:** Sparse layers stay available but weaken with lower confidence.
- **D-14:** Weak higher-resolution layers should effectively lean toward lower layers instead of pretending certainty.
- **D-15:** DuckDB is the authoritative offline build environment, and the application reads exported prior snapshots.
- **D-16:** Prior artifacts are rebuilt manually and kept as immutable snapshots.
- **D-17:** Soft priors may influence only soft drift signals and repair plausibility, never hard verdicts.
- **D-18:** User-facing prior evidence should expose layer contribution plus a concise representative pattern summary.

### the agent's Discretion
- Exact smoothing and backoff math, as long as layer separation and confidence-aware weakening remain explicit.
- Exact drift-type taxonomy names and score scale, as long as scores remain decomposed and repair-compatible.
- Exact DuckDB export artifact shape, as long as snapshot versioning and auditability are preserved.
- Exact confidence-to-threshold calibration, as long as sparse data reduces influence rather than creating false confidence.

### Deferred Ideas (OUT OF SCOPE)
- Project-specific and user-specific prior layers.
- Repair-outcome priors as a first-class statistical family.
- Scheduled automated prior rebuilding.
- User-facing raw pattern IDs or similar-case browsing.
</user_constraints>

<research_summary>
## Summary

Phase 4 should introduce a soft-pattern pipeline without diluting the deterministic architecture built in Phases 1 through 3. The recommended implementation keeps the corpus layer entirely offline during build time, then exports typed snapshots that the runtime can load as read-only priors. This preserves three important boundaries:

1. **Canonical normalization remains the shared language** between authored stories and corpus data.
2. **Hard logic remains authoritative** for contradictions and repairability.
3. **Soft priors stay advisory** by producing drift signals and repair-plausibility adjustments only.

The cleanest split matches the roadmap:

- **Plan 04-01:** Build the corpus normalization and prior snapshot pipeline. This should produce baseline and genre-layer snapshots from canonicalized corpus records, with explicit world-rule profiles and immutable snapshot metadata.
- **Plan 04-02:** Load those snapshots at runtime to compute decomposed soft drift scores and rerank repairs by plausibility while keeping hard verdict kinds unchanged.

DuckDB should act as the authoritative analytics environment because the user explicitly wants offline extraction and rebuildable priors. The app should not query the analytics store live. Instead, the build job should export versioned JSON snapshots or equivalent typed artifacts that contain:

- layer identity (`baseline` or `genre`)
- genre key and world profile
- sample counts and confidence metadata
- positive transition/state patterns
- drift-pattern statistics
- snapshot version and source-work provenance

Runtime scoring should then use those exports through conditional-probability lookup with hierarchical backoff. The recommended order is:

1. Attempt the most specific matching genre/world-profile prior.
2. Reduce the weight when sample size is sparse.
3. Back off toward the baseline layer if the specific layer provides weak evidence.

This keeps the soft layer mathematically explicit, explainable, and compatible with Phase 3 repair ranking.
</research_summary>

<standard_stack>
## Recommended Stack

### Core
| Technology | Purpose | Why it fits Phase 4 |
|------------|---------|---------------------|
| Existing TypeScript + Zod domain layer | Typed prior contracts, runtime validation, and snapshot loading | Keeps corpus exports aligned with canonical story contracts |
| DuckDB-backed offline build job | Corpus extraction, aggregation, and snapshot generation | Matches the locked `DuckDB authority + runtime export` decision |
| Existing Vitest test harness | Corpus normalization, prior scoring, and reranking regressions | Fast deterministic feedback already exists in the repo |

### Supporting
| Library / Module | Version | Purpose | When to Use |
|------------------|---------|---------|-------------|
| Existing canonical domain modules | current repo implementation | Normalize corpus records into event/state/world-rule structures | Use as the only normalization target |
| Existing repair contracts (`src/domain/repairs.ts`) | current repo implementation | Feed repair plausibility reranking | Use when augmenting candidate ranking without mutating validity |
| Existing verdict contracts (`src/domain/verdicts.ts`) | current repo implementation | Attach soft drift outputs or later explanation-facing summaries | Use if Phase 4 needs to persist prior evidence alongside verdict-facing services |
| pg-mem + existing storage tests | current project stable | Verify exported snapshots and runtime loaders without external infrastructure | Use for deterministic regression coverage where persistence joins the prior layer |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| DuckDB authority + exported snapshots | Runtime Postgres analytics queries | Simpler operationally, but breaks the user's offline analytics decision |
| Conditional probabilities + backoff | Embedding similarity first | More flexible, but weaker explainability and harder threshold semantics |
| Separate positive/drift priors | One blended rarity score | Simpler, but cannot distinguish common-valid patterns from common-instability patterns |

**Installation:**
```bash
# Phase 4 can stay inside the existing Node/Vitest workspace.
# If a DuckDB runner is needed during execution, add it then as part of the plan.
npm install
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```text
src/
├── domain/
│   └── priors.ts                # prior layers, snapshot contracts, soft drift outputs
├── corpus/
│   ├── types.ts                 # raw corpus work/scene contracts
│   ├── normalization.ts         # canonical event/state/world-rule extraction
│   ├── prior-build.ts           # baseline/genre snapshot builder
│   └── index.ts
├── engine/
│   ├── prior-snapshot-loader.ts # runtime loader for exported snapshots
│   ├── soft-prior-scoring.ts    # drift-type scoring + dynamic thresholds
│   ├── repair-plausibility.ts   # repair reranking using prior evidence
│   └── index.ts
└── services/
    └── soft-prior-evaluator.ts  # optional orchestration over findings + repairs

tests/
├── corpus/
│   ├── corpus-normalization.test.ts
│   └── prior-build.test.ts
├── engine/
│   ├── soft-prior-scoring.test.ts
│   └── repair-plausibility.test.ts
└── fixtures/
    ├── corpus-prior-fixtures.ts
    └── soft-prior-fixtures.ts
```

### Pattern 1: Canonical Corpus Normalization
**What:** Convert external works into the same event/state/world-rule vocabulary the engine already understands.
**When to use:** Before any aggregation or probability estimation.
**Example:**
```typescript
const normalized = normalizeCorpusWork({
  work,
  genreWeights,
  worldProfile
});
```

### Pattern 2: Snapshot-Oriented Prior Build
**What:** Build baseline and genre priors offline, then export immutable snapshots for runtime use.
**When to use:** During manual corpus rebuilds only.
**Example:**
```typescript
const snapshots = buildPriorSnapshots({
  normalizedWorks,
  snapshotVersion: "prior:2026-04-09"
});
```

### Pattern 3: Layered Soft Scoring
**What:** Compute drift-type scores using the most relevant layer first, then weaken or back off as sample confidence drops.
**When to use:** When a hard verdict is already known and Phase 4 needs advisory signals.
**Example:**
```typescript
const assessment = scoreSoftDrift({
  snapshotSet,
  eventTransition,
  stateTransition,
  genreWeights,
  worldProfile
});
```

### Pattern 4: Repair Plausibility Reranking
**What:** Use prior evidence to reorder repair candidates without changing the hard verdict.
**When to use:** After Phase 3 repair candidates already exist.
**Example:**
```typescript
const reranked = rerankRepairsWithPriors({
  repairs,
  softAssessment
});
```

### Anti-Patterns to Avoid
- **Using corpus frequency as hard truth:** This violates the project's hard/soft separation.
- **Flattening genre and world-profile effects into one label:** It hides the reality-default vs override distinction.
- **Runtime dependency on the analytics store:** It makes verdict behavior depend on mutable external state.
- **Single aggregate softness score only:** It obscures which kind of drift is being signaled and which layer caused it.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Corpus schema | Separate ad hoc corpus-only event model | Existing canonical event/state/rule contracts | Prevents divergence between authored stories and corpus analytics |
| Snapshot versioning | In-place overwrite of prior JSON files | Immutable snapshot IDs plus build metadata | Preserves auditability and rerun stability |
| Sparse-data handling | Binary on/off rule by genre | Confidence-aware weighting and backoff | Keeps weak evidence available without overstating it |
| Repair plausibility | Override hard verdict severity directly | Separate reranking or plausibility adjustment | Keeps Phase 4 advisory instead of law-like |

**Key insight:** Phase 4 should add a probabilistic sidecar, not a second contradictory rule engine.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Corpus Normalization Drift
**What goes wrong:** Corpus records encode event or rule semantics differently from authored stories, so priors become unusable at runtime.
**Why it happens:** The build pipeline invents a corpus-only schema instead of targeting canonical contracts.
**How to avoid:** Normalize corpus records directly into canonical event/state/world-rule exception structures.
**Warning signs:** Snapshot fields cannot be consumed by runtime engine code without ad hoc translation.

### Pitfall 2: Genre Priors Overfitting Sparse Samples
**What goes wrong:** A weak genre bucket emits strong drift warnings based on too little data.
**Why it happens:** The scoring layer treats every layer with equal authority regardless of sample count.
**How to avoid:** Track sample counts and confidence, then reduce contribution strength before backing off.
**Warning signs:** Rare genre tags dominate drift output even when only a handful of source works exist.

### Pitfall 3: Soft Priors Mutating Hard Verdicts
**What goes wrong:** A common pattern suppresses a contradiction, or an uncommon pattern creates a contradiction.
**Why it happens:** Soft scoring is merged into the hard severity ladder.
**How to avoid:** Keep soft drift and repair plausibility in separate result objects that cannot alter hard verdict kinds.
**Warning signs:** `Hard Contradiction` disappears merely because a genre prior considers it common.

### Pitfall 4: Prior Evidence Too Opaque
**What goes wrong:** The engine reports a soft score but cannot explain which layer or pattern caused it.
**Why it happens:** Only final probabilities are retained, not layer contributions or representative pattern summaries.
**How to avoid:** Record dominant layer, contribution breakdown, sample counts, and a short representative pattern summary.
**Warning signs:** Debugging a soft drift requires re-running the analytics job manually.
</common_pitfalls>

<sota_updates>
## Current-Practice Update

The current StoryGraph stack is now ready for probabilistic sidecars because Phase 3 established:

- stable evidence snapshots
- separate repair objects
- run-level auditability

This means Phase 4 does **not** need to invent new truth channels. It can safely augment:

- repair plausibility ordering
- soft drift outputs
- later explanation summaries

without revisiting the Phase 2 or Phase 3 hard contracts.

**New tools/patterns to consider later:**
- project-specific priors layered above genre priors
- repair-outcome priors as a distinct corpus family
- optional retrieval of similar corpus patterns for inspection UIs

**Deprecated/outdated for this phase:**
- single blended “consistency score” as the main prior output
- runtime queries directly against live analytics tables
- treating rarity alone as equivalent to drift
</sota_updates>

## Validation Architecture

Phase 4 should keep the same fast deterministic feedback model as earlier phases, but split it into corpus-build coverage and runtime soft-scoring coverage:

- `tests/corpus/corpus-normalization.test.ts` — corpus work normalization into canonical event/state/world-rule exception records
- `tests/corpus/prior-build.test.ts` — baseline/genre snapshot building, snapshot versioning, and export shape
- `tests/engine/soft-prior-scoring.test.ts` — drift-type scoring, dominant-layer attribution, sparse-data weakening, and dynamic thresholds
- `tests/engine/repair-plausibility.test.ts` — repair reranking that uses prior evidence without changing hard verdict kinds

Vitest already exists, so Wave 0 is satisfied by the current workspace. Phase 4 only needs new test files and a dedicated script such as `npm run test:priors` to bundle the corpus and soft-prior suites.

<open_questions>
## Open Questions

1. **Should prior snapshots live only as exported JSON artifacts or also round-trip through PostgreSQL later?**
   - What we know: The user chose `DuckDB authority + runtime export`.
   - What's unclear: Whether later UI or API phases will need relational querying over prior artifacts.
   - Recommendation: Keep Phase 4 runtime on exported snapshots only. Revisit database ingestion only if later phases need indexed querying.

2. **Should world-profile labels be fixed enums or extensible user-authored records later?**
   - What we know: Phase 4 needs explicit world-rule profiles distinct from genre labels.
   - What's unclear: How much user-authored world-profile customization should be supported before project/user priors exist.
   - Recommendation: Start with a strict enum or narrow typed union in Phase 4, then generalize only when project/user priors arrive.

3. **How much of prior evidence should feed directly into Phase 3 explanation payloads?**
   - What we know: The user wants layer contribution plus representative pattern summary.
   - What's unclear: Whether that should be stored in verdict evidence immediately or remain a separate service output first.
   - Recommendation: Start with separate soft-prior outputs and integrate into verdict-facing payloads only if a later inspection phase needs persistence.
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `.planning/phases/04-corpus-priors-and-soft-pattern-layer/04-CONTEXT.md` — locked Phase 4 decisions and output boundaries
- `.planning/ROADMAP.md` — Phase 4 goal, success criteria, and two-plan decomposition
- `.planning/REQUIREMENTS.md` — requirement IDs `SOFT-01` and `DATA-02`
- `AGENTS.md` — stack guidance explicitly recommending DuckDB for offline corpus mining and warning against prompt-only verdicting
- `src/domain/events.ts`, `src/domain/state.ts`, `src/domain/rules.ts`, `src/domain/transitions.ts` — canonical contracts corpus normalization must target
- `src/domain/repairs.ts` and `src/domain/verdicts.ts` — current runtime contracts soft priors must augment without replacing
- `src/engine/hard-constraint-engine.ts` and `src/engine/repair-ranking.ts` — existing hard-check and repair-ranking boundaries Phase 4 must respect

### Secondary (MEDIUM confidence)
- `.planning/phases/03-evidence-and-repair-reasoning/03-CONTEXT.md` — separation between repair suggestions, evidence, and hard verdict truth
- `.planning/phases/03-evidence-and-repair-reasoning/03-SECURITY.md` — current audit expectations around explainability and run-level provenance
- `.planning/phases/03-evidence-and-repair-reasoning/03-VALIDATION.md` — validation pattern and test cadence to extend
- `tests/fixtures/hard-constraint-fixtures.ts` — canonical scenarios available for early soft-prior and repair-plausibility fixtures

### Tertiary (LOW confidence - needs validation)
- None. This research pass stayed inside locked project artifacts and the live codebase.
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: offline corpus normalization, DuckDB-backed snapshot building, layered conditional priors, and runtime soft scoring
- Ecosystem: existing TypeScript/Zod canonical model, repair pipeline, and Vitest harness
- Patterns: snapshot export, confidence-aware backoff, decomposed soft drift scores, repair plausibility reranking
- Pitfalls: corpus schema drift, sparse genre overfitting, soft/hard contract collapse, opaque prior evidence

**Confidence breakdown:**
- Standard stack: HIGH - directly grounded in the project stack and locked DuckDB decision
- Architecture: HIGH - follows existing hard engine and repair boundaries instead of replacing them
- Pitfalls: HIGH - derived from the exact risks created by adding probabilistic sidecars
- Code examples: MEDIUM - they are target contracts for planning, not copied from an implemented prior layer

**Research date:** 2026-04-09
**Valid until:** 2026-05-09
</metadata>

---

*Phase: 04-corpus-priors-and-soft-pattern-layer*
*Research completed: 2026-04-09*
*Ready for planning: yes*
