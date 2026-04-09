# Phase 3: Evidence and Repair Reasoning - Research

**Researched:** 2026-04-09
**Domain:** Deterministic verdict explanation, repair suggestion generation, and rerun diffing over canonical story graphs
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Failing verdicts expose structured evidence rather than ID-only references.
- **D-02:** Evidence must include canonical IDs, reason code, concise summaries of the relevant events, states, and rules, plus the conflict or missing-cause path and missing-premise summary.
- **D-03:** Evidence snapshots store the directly relevant state axes plus the immediately preceding state change that made those axes relevant.
- **D-04:** Evidence is persisted as a structured snapshot at verdict time rather than reconstructed on demand from ID pointers alone.
- **D-05:** User-facing explanation text is generated deterministically by composing structured evidence fields rather than by LLM wording.
- **D-06:** Repair generation branches by verdict kind and reason taxonomy instead of emitting the same repair families for every failure.
- **D-07:** Repair candidates are stored as typed repair objects, with human-readable summaries rendered from those objects.
- **D-08:** Repair generation is evidence-first and may use only limited inference that is explicitly allowed by the reason taxonomy.
- **D-09:** The generator searches locally around the failing path rather than scanning the full revision or external case history in Phase 3.
- **D-10:** Prior-event repairs are inserted at the causal-path break point first, not merely at the event immediately before the contradiction.
- **D-11:** Repair ranking is separate from current validity and orders candidates by `minimal change -> fit with current story/world -> locality`.
- **D-12:** Repair suggestions are generated for the representative failing verdict and for supporting findings only when those findings are themselves repairable.
- **D-13:** Candidate deduplication merges overlapping repairs into one displayed option while preserving provenance to all source findings internally.
- **D-14:** Candidate output is capped at the top three repair options per failing verdict.
- **D-15:** User-facing repair confidence is shown as ordinal bands (`high`, `medium`, `low`) rather than raw numeric scores.
- **D-16:** Repair composition defaults to single repair objects, with only tightly limited small bundles allowed when the taxonomy explicitly permits them.
- **D-17:** Rerun comparison shows representative verdict changes plus supporting-finding changes, not just a single headline label.
- **D-18:** Finding continuity across reruns uses a stable finding ID rather than plain reason-code or semantic matching.
- **D-19:** Every evaluation execution records a separate verdict run, even when multiple runs target the same revision.
- **D-20:** Phase 3 diff compares the current run against the immediately previous verdict run only.
- **D-21:** `not evaluated` downstream findings remain visible in explanation output as blocked analyses, but they do not receive repair candidates.
- **D-22:** Repair candidates must remain suggestions; they are never represented as already-true canonical updates or auto-applied patches.

### the agent's Discretion
- Exact stable-finding fingerprint composition, as long as it remains deterministic and diff-safe.
- Exact internal score formula behind `high / medium / low` repair confidence bands.
- Exact typed-repair object field set per reason family, as long as provenance and deterministic rendering survive.
- Exact storage layout for structured evidence snapshots and run metadata inside persistence boundaries.

### Deferred Ideas (OUT OF SCOPE)
- Corpus-backed plausibility priors for repair ranking.
- Natural-language or LLM-based paraphrase of deterministic explanations.
- Arbitrary historical run comparison beyond the immediately previous run.
- Full proof-trace or solver-derivation output.
</user_constraints>

<research_summary>
## Summary

Phase 3 should extend the existing hard-constraint engine rather than replace it. The current code already produces deterministic representative verdicts, supporting findings, and `notEvaluated` metadata. The missing layer is a second-stage reasoning surface that can transform those findings into stable evidence snapshots, deterministic explanation text, typed repair candidates, and run-to-run diffs.

The cleanest implementation path is to keep the Phase 2 engine outputs as the canonical reasoning substrate and add three new layers around them:

1. **Evidence materialization** — convert checker findings plus canonical graph context into persisted evidence snapshots that remain stable after reruns.
2. **Repair generation** — build reason-specific typed repair objects from the failing path only, rank them separately from validity, and keep them provenance-linked to the source findings.
3. **Verdict runs and diffs** — persist each evaluation execution as its own run, attach stable finding IDs, and compare the current run only with the immediately previous run.

The current repository/storage layer is close to what Phase 3 needs, but two concrete gaps exist. First, `verdicts` currently store only revision-level records with no concept of a verdict run. Second, evidence payloads still expose mostly ID lists plus supporting findings, which is not enough for deterministic explanation snapshots or rerun comparison. The recommended approach is therefore:

- enrich `src/domain/verdicts.ts` with structured evidence snapshot schemas;
- add dedicated repair-domain contracts instead of squeezing repair candidates into freeform JSON;
- introduce a `verdict_runs` persistence layer so every engine execution has a stable audit record;
- keep explanation rendering deterministic and template/data-driven rather than LLM-generated.

**Primary recommendation:** Build Phase 3 as a deterministic post-processing and persistence layer around the existing hard engine: evidence snapshots first, typed repairs second, verdict-run diffing third.
</research_summary>

<standard_stack>
## Standard Stack

The established libraries/tools for this phase:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9 | Deterministic evidence builders, repair generators, and rerun diff services | Already the project’s reasoning/runtime language and the safest way to keep phase outputs auditable |
| Zod | current project stable | Runtime validation for evidence snapshots, repair objects, and verdict-run records | Matches the existing domain pattern and prevents silent drift in explanation payloads |
| Vitest | current project stable | Unit and integration coverage for evidence rendering, repair generation, and rerun diff behavior | Already the active verification harness and fast enough for wave-by-wave checks |
| PostgreSQL schema + repositories | existing Phase 1/2 layer | Persistence for verdict runs, evidence snapshots, and diff metadata | The project already treats repositories as the canonical storage boundary |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Existing `src/engine/*` modules | current repo implementation | Hard-constraint findings that Phase 3 explains and repairs | Use as the only reasoning source of truth; do not duplicate rule logic |
| Existing snapshot services | current repo implementation | Boundary and lineage facts for state evidence and prior-event insertion | Use whenever explanation or repair logic needs state provenance |
| pg-mem | current project stable | Persistence and run-history integration tests without a live database | Use for verdict-run, diff, and repository-level regression tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Deterministic explanation renderer | LLM phrasing layer now | More natural text, but it breaks the project’s explainability core |
| Local-path repair generation | Full-revision or semantic retrieval repair search | Broader search, but much noisier and less explainable in Phase 3 |
| Separate verdict-run table | Reusing only revision-level verdict rows | Simpler schema, but it cannot preserve rerun history or stable diff baselines |

**Installation:**
```bash
# No new packages are required for the recommended Phase 3 path.
npm install
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```text
src/
├── domain/
│   ├── verdicts.ts        # structured evidence snapshot + run metadata
│   └── repairs.ts         # typed repair contracts
├── engine/
│   ├── evidence-*.ts      # evidence builders + deterministic explanation rendering
│   ├── repair-*.ts        # repair generation and ranking
│   └── verdict-diff.ts    # stable finding comparison helpers
├── services/
│   ├── explained-verdicts.ts
│   └── verdict-runner.ts
└── storage/
    └── repositories/
        ├── verdict-repository.ts
        └── verdict-run-repository.ts
```

### Pattern 1: Evidence Snapshot Materialization
**What:** Convert checker findings plus canonical graph context into a persisted structured evidence payload.
**When to use:** Whenever a verdict is about to be stored or returned for inspection.
**Example:**
```typescript
const explainedVerdict = buildExplainedVerdictRecord({
  graph,
  event,
  evaluation,
  activeRules,
  boundaryFactsByCharacterId
});
```

### Pattern 2: Reason-Family Repair Generator
**What:** Select repair families by reason taxonomy, then generate only locally grounded candidates.
**When to use:** After a failing representative verdict or repairable supporting finding is materialized.
**Example:**
```typescript
const repairs = generateRepairCandidates({
  graph,
  finding,
  evidenceSnapshot,
  maxCandidates: 3
});
```

### Pattern 3: Run-Centric Verdict Diffing
**What:** Persist each evaluation execution as a verdict run, then diff it against the immediately previous run using stable finding IDs.
**When to use:** Every on-demand rerun or post-edit evaluation in Phase 3.
**Example:**
```typescript
const currentRun = await executeVerdictRun({ storyId, revisionId });
const diff = await diffAgainstPreviousRun({
  storyId,
  revisionId,
  currentRunId: currentRun.runId
});
```

### Anti-Patterns to Avoid
- **Reconstructing old evidence from current state only:** This makes past verdict explanations drift after edits.
- **Treating repairs as truth updates:** A repair candidate is a suggestion and must not silently mutate canonical state.
- **Semantic-only finding matching:** It will make rerun diffs unstable and hard to audit.
- **Global repair search in Phase 3:** It adds speculative noise before the soft-prior layer exists.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Verdict explanation text | Ad hoc string concatenation spread across checkers | One deterministic explanation renderer fed by structured evidence | Keeps wording stable and testable |
| Rerun history | Overwrite-in-place revision verdicts | Explicit `verdict_runs` records plus run-linked verdict rows | Preserves diffability and audit history |
| Repair provenance | Freeform repair notes | Typed repair objects with explicit `sourceFindingIds` | Keeps deduplication and ranking explainable |
| State context lookup | Custom scans for “recently changed” facts | `SnapshotRebuilder` and `StoryBoundaryQueryService` | Existing services already preserve lineage and provenance |

**Key insight:** Phase 3 should formalize explanation and repair as first-class contracts, not bury them inside one-off helper objects.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Evidence Snapshot Drift
**What goes wrong:** A rerun changes current state, and old verdicts now render with newer explanations.
**Why it happens:** Evidence is reconstructed lazily from canonical IDs instead of being snapshotted at verdict time.
**How to avoid:** Persist structured evidence snapshots and explanation inputs alongside each verdict record.
**Warning signs:** The same run renders a different explanation after unrelated revisions are saved.

### Pitfall 2: Repairs That Ignore Failure Topology
**What goes wrong:** Repair suggestions jump to arbitrary world-rule changes or distant events that technically fix the issue but break explainability.
**Why it happens:** The generator searches the whole revision or allows unrestricted inference.
**How to avoid:** Restrict repair search to the failing path and reason-approved inference families.
**Warning signs:** Top-ranked repairs modify unrelated locations, characters, or story-level rules.

### Pitfall 3: Finding IDs That Change With Wording
**What goes wrong:** A minor explanation-text change makes rerun diff treat the same issue as “removed + added”.
**Why it happens:** Identity depends on text instead of canonical scope and evidence shape.
**How to avoid:** Build stable finding IDs from checker, reason code, and normalized evidence fingerprint fields.
**Warning signs:** Diff results oscillate even when underlying event/rule context is unchanged.

### Pitfall 4: Repairs Competing With Validity
**What goes wrong:** The UI or API starts presenting “best repair” as if it were the current verdict.
**Why it happens:** Validity and repair ranking are stored in the same field or rendered in the same channel.
**How to avoid:** Keep repair candidates as a separate typed collection with their own ordering and confidence band.
**Warning signs:** A `Repairable Gap` appears to become valid merely because a high-confidence repair exists.
</common_pitfalls>

<code_examples>
## Code Examples

Verified implementation patterns for this project:

### Structured Evidence Snapshot
```typescript
export const VerdictEvidenceSnapshotSchema = z.object({
  eventIds: z.array(EventIdSchema).default([]),
  stateBoundaryIds: z.array(StateBoundaryIdSchema).default([]),
  ruleVersionIds: z.array(RuleVersionIdSchema).default([]),
  eventSummaries: z.array(EventEvidenceSummarySchema).default([]),
  stateSummaries: z.array(StateEvidenceSummarySchema).default([]),
  ruleSummaries: z.array(RuleEvidenceSummarySchema).default([]),
  conflictPath: z.array(z.string()).default([]),
  missingPremises: z.array(MissingPremiseSchema).default([])
});
```

### Typed Repair Candidate
```typescript
export const RepairCandidateSchema = z.object({
  repairId: z.string().min(1),
  repairType: z.enum(["add_missing_assumption", "add_prior_event", "declare_rule", "repair_bundle"]),
  reasonCode: z.string().min(1),
  sourceFindingIds: z.array(z.string()).default([]),
  confidenceBand: z.enum(["high", "medium", "low"]),
  summary: z.string().min(1)
});
```

### Run-Oriented Diff Result
```typescript
export const VerdictRunDiffSchema = z.object({
  currentRunId: z.string().min(1),
  previousRunId: z.string().min(1).optional(),
  representativeVerdictChanged: z.boolean(),
  addedFindingIds: z.array(z.string()).default([]),
  resolvedFindingIds: z.array(z.string()).default([]),
  persistedFindingIds: z.array(z.string()).default([])
});
```
</code_examples>

<sota_updates>
## State of the Art (Project Direction 2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Representative verdicts only | Representative verdicts plus structured evidence, repair objects, and rerun diff contracts | Locked by 2026-04-09 Phase 3 context | Plans must add post-processing and persistence contracts, not only new labels |
| Revision-level verdict storage only | Run-level verdict history with previous-run diffs | Recommended by this research pass | Persistence must distinguish revision identity from execution identity |
| Generic repair brainstorming | Reason-scoped typed repairs with bounded inference | Locked by Phase 3 decisions | Repair generation should stay taxonomy-driven and deterministic |

**New tools/patterns to consider later:**
- Corpus-backed repair plausibility reranking once Phase 4 soft priors exist.
- Optional UI-layer paraphrase of deterministic explanations if a later presentation phase needs it.

**Deprecated/outdated for this phase:**
- LLM-authored explanation text as the primary explanation source.
- Whole-revision speculative repair search.
- Overwriting verdicts in place with no preserved rerun history.
</sota_updates>

## Validation Architecture

Phase 3 should follow the same fast-feedback model as Phase 2: short deterministic Vitest runs after each task, then a full suite after each wave. The new coverage should be centered on four families:

- `tests/engine/evidence-traces.test.ts` — evidence snapshot assembly, deterministic explanation rendering, and blocked-check visibility
- `tests/engine/repair-generator.test.ts` — reason-specific repair families, ranking, deduplication, confidence bands, and top-3 output guarantees
- `tests/engine/verdict-runner.test.ts` — one-run-per-execution persistence, run linking, and storage integration
- `tests/engine/verdict-diff.test.ts` — stable finding ID continuity and previous-run diff semantics

Wave 0 is already satisfied by the existing Vitest workspace and pg-mem-backed persistence tests. No new framework bootstrap is required for Phase 3.

<open_questions>
## Open Questions

1. **Should stable finding IDs live as top-level verdict columns or inside the evidence payload?**
   - What we know: Current verdict persistence already treats most reasoning detail as structured JSONB evidence.
   - What's unclear: Whether later UI/query layers will need relational filtering by finding ID.
   - Recommendation: Keep stable finding IDs inside evidence in Phase 3 unless query pressure appears during implementation.

2. **Should repair candidates be persisted immediately or generated on demand from stored evidence?**
   - What we know: Phase 3 requires deterministic repair output, but not yet historical repair diffing.
   - What's unclear: Whether downstream consumers need past repair snapshots or only current rerun output.
   - Recommendation: Persist typed repair candidates only if the rerun service already needs them. Otherwise, keep generation deterministic and service-level first.

3. **Should verdict-run support modify `0001_canonical_core.sql` or introduce a new migration plus loader update?**
   - What we know: The current schema loader only applies `0001_canonical_core.sql`.
   - What's unclear: Whether the repo wants to stay on a single evolving migration or begin ordered multi-migration loading now.
   - Recommendation: Prefer adding `0002_verdict_runs.sql` plus lexical migration loading in `src/storage/schema.ts`, because run history is a new persistence capability rather than a small column tweak.
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `.planning/phases/03-evidence-and-repair-reasoning/03-CONTEXT.md` — locked Phase 3 decisions and output constraints
- `.planning/ROADMAP.md` — Phase 3 goal, success criteria, and plan decomposition
- `.planning/REQUIREMENTS.md` — requirement IDs `VERD-02`, `VERD-03`, `REPR-01`, `REPR-02`
- `src/domain/verdicts.ts` — current verdict/evidence contract that Phase 3 must evolve
- `src/engine/hard-constraint-engine.ts` and `src/engine/verdict-aggregator.ts` — current representative-verdict pipeline and finding semantics
- `src/engine/types.ts` — current evaluation and `notEvaluated` structures
- `src/services/snapshot-rebuilder.ts` and `src/services/story-boundary-query.ts` — current deterministic state and lineage access patterns
- `src/storage/repositories/verdict-repository.ts` and `src/storage/migrations/0001_canonical_core.sql` — current verdict persistence limits

### Secondary (MEDIUM confidence)
- `.planning/phases/02-hard-constraint-engine/02-CONTEXT.md` — upstream hard-engine decisions that explanation and repair must respect
- `.planning/phases/02-hard-constraint-engine/02-VALIDATION.md` — active validation strategy patterns to extend
- `tests/engine/hard-constraint-engine.test.ts` and `tests/storage/persistence.test.ts` — current integration patterns for engine and repository behavior

### Tertiary (LOW confidence - needs validation)
- None. This research pass stayed inside locked project artifacts and the live codebase.
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: deterministic verdict explanation, repair generation, and rerun diffing in a TypeScript + Zod codebase
- Ecosystem: existing hard engine, repository layer, canonical storage, and test harness
- Patterns: evidence snapshotting, typed repair objects, run-level verdict history, stable diffing
- Pitfalls: explanation drift, over-broad repair search, unstable finding IDs, validity/repair conflation

**Confidence breakdown:**
- Standard stack: HIGH - reuses the existing project stack and live code patterns
- Architecture: HIGH - directly grounded in the current engine, repository, and context decisions
- Pitfalls: HIGH - derived from concrete gaps in current verdict/evidence/run handling
- Code examples: MEDIUM - they are project-aligned target contracts, not copied from finished implementation

**Research date:** 2026-04-09
**Valid until:** 2026-05-09
</metadata>

---

*Phase: 03-evidence-and-repair-reasoning*
*Research completed: 2026-04-09*
*Ready for planning: yes*
