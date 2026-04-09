# Phase 4: Corpus Priors and Soft Pattern Layer - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase adds a corpus-derived soft-pattern layer on top of the existing canonical model, hard constraint engine, and evidence/repair stack. It covers offline corpus normalization, prior extraction, layered soft-prior artifacts, and soft scoring that can flag drift or influence repair plausibility without changing hard verdict semantics. It does not yet add project/user priors, natural-language ingestion, or UI-facing corpus exploration.

</domain>

<decisions>
## Implementation Decisions

### Corpus Scope and Quality
- **D-01:** Soft priors use a layered corpus strategy with a shared human-story baseline plus separate genre-specific corpora.
- **D-02:** Phase 4 corpus intake prioritizes completed works that are commercially or critically validated rather than broad unfiltered volume.
- **D-03:** Genre labeling must support weighted multi-genre assignments, while world-model labeling stays separate as a dedicated world-rule profile.
- **D-04:** Phase 4 implements baseline and genre priors only; project/user priors are deferred.

### Pattern Unit and Canonical Normalization
- **D-05:** The reusable prior unit is `event transition + state transition` rather than event-only frequency or large arc templates.
- **D-06:** Corpus normalization must extract canonical events, state transitions, and world-rule exceptions before prior building.
- **D-07:** Reality-default vs override behavior remains explicit in the prior layer, so fantastical or sci-fi exceptions are modeled as world-profile differences instead of noisy event frequency.

### Prior Mathematics and Scoring
- **D-08:** Soft priors are represented as conditional probabilities with hierarchical backoff rather than opaque embeddings or single global scores.
- **D-09:** Prior scoring must be layered, with separated contribution records for baseline and genre priors.
- **D-10:** Soft output is decomposed into drift-type scores plus the dominant prior layer, not collapsed into one scalar.
- **D-11:** Prior application uses dynamic thresholds that account for confidence and sample size instead of one fixed threshold.

### Negative Patterns and Sparse Data
- **D-12:** Positive priors and drift priors are modeled separately, so the engine can distinguish common-valid patterns from common-instability patterns.
- **D-13:** Sparse data does not immediately disable a layer; low-sample priors remain available but contribute more weakly according to confidence.
- **D-14:** If a higher-resolution prior becomes too weak, the scoring behavior should effectively lean toward the more stable lower layer rather than pretending certainty.

### Storage, Rebuild, and Runtime Use
- **D-15:** Offline corpus analysis uses DuckDB as the authoritative build environment, and the application consumes exported prior snapshots rather than querying live corpus tables directly.
- **D-16:** Prior artifacts are rebuilt manually and versioned as snapshots; new corpus builds must not overwrite prior snapshots in place.

### Explainability and Runtime Boundaries
- **D-17:** Soft priors may contribute only to soft drift signals and repair-ranking plausibility; they must never promote corpus frequency into hard rules or overturn hard verdicts.
- **D-18:** User-facing prior evidence should expose layer contribution plus a short representative pattern summary, while internal artifacts may retain richer pattern identifiers.

### the agent's Discretion
- Exact conditional-probability schema and smoothing details, as long as backoff and layer separation remain explicit.
- Exact drift-type taxonomy, as long as it stays decomposed and compatible with repair plausibility ranking.
- Exact export artifact layout from DuckDB into the runtime application, as long as snapshot versioning and auditability are preserved.
- Exact confidence-to-threshold mapping, as long as sparse-data influence weakens instead of being mistaken for strong evidence.

</decisions>

<specifics>
## Specific Ideas

- The user wants corpus-backed reasoning to stay mathematically useful without ever becoming “hard law.”
- Genre tendencies and world-rule tendencies must be separated, because reality-default and rule-override structure is already a core part of StoryGraph.
- The user prefers reliable priors over large noisy corpora, so Phase 4 should optimize for trustworthiness first.
- Soft output should remain explainable enough to say not only “this drifted,” but also which layer and representative pattern drove that judgment.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and Phase Contracts
- `.planning/PROJECT.md` — project philosophy, explainability requirement, and logic-led vs soft-prior separation
- `.planning/REQUIREMENTS.md` — Phase 4 requirements `SOFT-01` and `DATA-02`
- `.planning/ROADMAP.md` — fixed Phase 4 boundary, success criteria, and two-plan breakdown
- `.planning/STATE.md` — cross-phase decisions and current blocker notes

### Upstream Phase Decisions
- `.planning/phases/01-canonical-narrative-schema/01-CONTEXT.md` — canonical event/state/rule model that corpus normalization must target
- `.planning/phases/02-hard-constraint-engine/02-CONTEXT.md` — hard-engine boundaries that soft priors must not override
- `.planning/phases/03-evidence-and-repair-reasoning/03-CONTEXT.md` — repair, evidence, and rerun semantics that soft priors should augment rather than redefine
- `.planning/phases/03-evidence-and-repair-reasoning/03-SECURITY.md` — audit constraints around deterministic evidence and run-level provenance
- `.planning/phases/03-evidence-and-repair-reasoning/03-VALIDATION.md` — existing verification conventions to extend for corpus and soft-prior logic

### Stack Guidance
- `AGENTS.md` — recommended stack includes DuckDB for offline corpus mining, PostgreSQL for canonical runtime storage, and the rule that prompt-only verdicting is disallowed

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/domain/events.ts`, `src/domain/state.ts`, `src/domain/rules.ts`, `src/domain/transitions.ts` — canonical contracts that corpus extraction must normalize toward
- `src/domain/verdicts.ts` and `src/domain/repairs.ts` — existing verdict and repair shapes that soft priors will enrich, not replace
- `src/services/explained-verdicts.ts` and `src/services/verdict-diff.ts` — explainability and diff surfaces that may later consume prior-layer evidence
- `src/engine/checkers/*.ts` and `src/engine/hard-constraint-engine.ts` — hard logic layer that Phase 4 must leave authoritative
- `tests/fixtures/hard-constraint-fixtures.ts` — canonical scenarios that can seed early soft-prior regression fixtures

### Established Patterns
- Runtime behavior is deterministic and schema-backed, so prior snapshots should load through typed contracts rather than ad hoc JSON blobs.
- Storage and auditing are explicit and version-aware, so prior builds should follow the same snapshot/provenance mindset as verdict runs.
- Repair ranking is already separated from validity, which gives Phase 4 a clean place to inject plausibility evidence without corrupting hard truth.
- Existing validation flows prefer fast reproducible automation, so corpus analytics should be testable offline without external services.

### Integration Points
- Corpus normalization should target the same canonical event/state/world-rule representation already used by the engine.
- Soft drift output should integrate beside hard findings, not inside the hard checker severity ladder.
- Repair plausibility should consume Phase 3 repair candidates as inputs and return ranked soft signals layered on top of existing repair objects.
- DuckDB build outputs should be exportable into runtime-consumable snapshots that the application can load without a live analytics dependency.

</code_context>

<deferred>
## Deferred Ideas

- Project-specific and user-specific priors — deferred beyond Phase 4
- Repair outcome priors as a distinct third statistical family — deferred until the baseline positive/drift split is proven
- Automatic scheduled prior rebuilding — deferred until manual snapshot workflows stabilize
- User-facing surfacing of raw pattern IDs or similar-case browsing — deferred until inspection UI phases

</deferred>

---

*Phase: 04-corpus-priors-and-soft-pattern-layer*
*Context gathered: 2026-04-09*
