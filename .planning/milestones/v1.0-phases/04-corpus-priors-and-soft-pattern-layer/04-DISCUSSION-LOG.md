# Phase 4: Corpus Priors and Soft Pattern Layer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 04-corpus-priors-and-soft-pattern-layer
**Areas discussed:** corpus scope, pattern unit, soft-prior role, prior layering, corpus quality, genre/world labeling, prior math, rebuild policy, normalization depth, negative patterns, storage model, prior evidence exposure, sparse-data handling, project/user prior timing, soft drift output, threshold policy

---

## Corpus Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Mixed universal corpus | One large mixed corpus with little genre separation | |
| Baseline + genre-separated corpora | Human-story baseline plus genre-specific corpora | ✓ |
| Project/author-specific first | Center priors on project- or author-local corpora | |

**User's choice:** Baseline + genre-separated corpora  
**Notes:** The user wants shared human-story priors without flattening genre differences into one average.

---

## Pattern Unit

| Option | Description | Selected |
|--------|-------------|----------|
| Event transition only | Mine only event-to-event transition frequencies | |
| Event transition + state transition pair | Mine event movement together with state-change context | ✓ |
| Arc template | Mine larger motif or arc templates first | |

**User's choice:** Event transition + state transition pair  
**Notes:** This keeps the corpus layer aligned with StoryGraph's minimum reasoning unit.

---

## Soft-Prior Runtime Role

| Option | Description | Selected |
|--------|-------------|----------|
| Soft drift only | Prior can only flag drift and cannot affect repair ranking | |
| Soft drift + repair ranking | Prior adds drift signals and influences repair plausibility ranking | ✓ |
| Also explanation quality warnings | Prior also scores explanation quality directly | |

**User's choice:** Soft drift + repair ranking  
**Notes:** The user wants corpus evidence to help ranking and drift detection without touching hard truth.

---

## Prior Layering

| Option | Description | Selected |
|--------|-------------|----------|
| Single combined score | Merge all priors into one opaque value | |
| Layered priors with separated contribution | Keep baseline and genre contributions separate | ✓ |
| Genre only | Ignore baseline and future user/project layering | |

**User's choice:** Layered priors with separated contribution  
**Notes:** Explainability matters more than a single flattened score.

---

## Corpus Quality Gate

| Option | Description | Selected |
|--------|-------------|----------|
| Completed and validated works first | Prefer completed works with commercial or critical validation | ✓ |
| Any completed work | Admit broad completed corpora regardless of validation level | |
| Human-curated only | Require strong manual curation before inclusion | |

**User's choice:** Completed and validated works first  
**Notes:** The user wants reliable priors before broad coverage.

---

## Genre and World Labeling

| Option | Description | Selected |
|--------|-------------|----------|
| Single genre + single world profile | Use one dominant label for each | |
| Weighted multi-genre + separate world profile | Keep mixed genre weights and independent world-rule labels | ✓ |
| Genre only | Ignore separate world-model profiles | |

**User's choice:** Weighted multi-genre + separate world profile  
**Notes:** Genre tendencies and world-rule tendencies must not collapse into the same label.

---

## Prior Mathematics

| Option | Description | Selected |
|--------|-------------|----------|
| Simple transition counts | Use raw frequency tables only | |
| Conditional probability + hierarchical backoff | Use conditional priors with explicit backoff between layers | ✓ |
| Pattern graph or embedding first | Lead with graph similarity or embedding methods | |

**User's choice:** Conditional probability + hierarchical backoff  
**Notes:** The user wants mathematically explicit priors with clear fallback behavior.

---

## Rebuild Policy

| Option | Description | Selected |
|--------|-------------|----------|
| Manual rebuild + snapshot versions | Rebuild explicitly and preserve prior snapshots | ✓ |
| Scheduled batch rebuild | Regenerate priors on a cadence | |
| Always overwrite latest | Replace priors in place every time | |

**User's choice:** Manual rebuild + snapshot versions  
**Notes:** Auditability and rerun stability matter more than automatic freshness right now.

---

## Corpus Normalization Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Event/state only | Normalize only events and state changes | |
| Event/state + world-rule exceptions | Include override and exception rule structure during normalization | ✓ |
| Event/state + rules + repair cases | Also normalize repair cases in detail | |

**User's choice:** Event/state + world-rule exceptions  
**Notes:** The prior layer must remain compatible with StoryGraph's reality-default plus override model.

---

## Negative Pattern Modeling

| Option | Description | Selected |
|--------|-------------|----------|
| Positive priors only | Model only common-valid patterns | |
| Positive priors + drift priors | Separate common-valid and common-instability patterns | ✓ |
| Add repair-outcome priors too | Also model repair success/failure as its own family | |

**User's choice:** Positive priors + drift priors  
**Notes:** The user wants real drift signals, not just rarity warnings.

---

## Prior Storage

| Option | Description | Selected |
|--------|-------------|----------|
| DuckDB authority + runtime export | Build priors in DuckDB and export snapshots for the app | ✓ |
| Postgres-centered snapshots | Treat Postgres as the main prior store | |
| Dual authority | Treat DuckDB and Postgres as equal authorities | |

**User's choice:** DuckDB authority + runtime export  
**Notes:** Offline analytics and runtime consumption should stay separated.

---

## Prior Evidence Exposure

| Option | Description | Selected |
|--------|-------------|----------|
| Layer contribution only | Show only which layer contributed and by how much | |
| Layer contribution + representative pattern summary | Show layer effect plus a concise pattern explanation | ✓ |
| Surface raw pattern IDs or similar cases | Expose detailed pattern identifiers directly | |

**User's choice:** Layer contribution + representative pattern summary  
**Notes:** The user wants explainable soft reasoning without overloading the output with analytics internals.

---

## Sparse-Data Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate baseline backoff | Drop to baseline as soon as data is sparse | |
| Disable sparse priors entirely | Turn the layer off below a minimum sample count | |
| Weaken influence with lower confidence | Keep sparse priors but reduce their strength | ✓ |

**User's choice:** Weaken influence with lower confidence  
**Notes:** Sparse priors should not pretend to be strong, but they also should not vanish too early.

---

## Project/User Prior Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Baseline + genre only for Phase 4 | Delay project/user priors to a later phase | ✓ |
| Reserve schema but not behavior | Add future slots now but do not activate them | |
| Include project/user priors now | Build all prior layers immediately | |

**User's choice:** Baseline + genre only for Phase 4  
**Notes:** The user wants the first prior phase to stay bounded and verifiable.

---

## Soft Drift Output

| Option | Description | Selected |
|--------|-------------|----------|
| Single soft score | Return one aggregate soft score | |
| Drift-type scores + dominant layer | Return decomposed drift scores and the dominant prior layer | ✓ |
| Labels only | Return qualitative labels without scoring | |

**User's choice:** Drift-type scores + dominant layer  
**Notes:** The user prefers decomposed soft signals over one opaque score.

---

## Threshold Policy

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed threshold | Use one global warning threshold | |
| Genre-specific threshold | Use different thresholds per genre | |
| Dynamic threshold from confidence and sample size | Adjust threshold according to evidence strength | ✓ |

**User's choice:** Dynamic threshold from confidence and sample size  
**Notes:** Thresholds should respect sparse-data confidence rather than treat every layer equally.

---

## the agent's Discretion

- Exact smoothing and backoff formulas for conditional priors
- Exact drift-type taxonomy names and score scale
- Exact export artifact schema from DuckDB to runtime snapshots
- Exact confidence-to-threshold calibration

## Deferred Ideas

- Project-specific and user-specific prior layers
- Separate repair-outcome priors as a first-class family
- Scheduled automated prior rebuilding
- Raw pattern ID and similar-case exposure in the user-facing surface

---

*Phase: 04-corpus-priors-and-soft-pattern-layer*
*Discussion log generated: 2026-04-09*
