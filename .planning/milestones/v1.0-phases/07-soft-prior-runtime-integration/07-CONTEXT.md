# Phase 7: Soft-Prior Runtime Integration - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase wires Phase 4 advisory soft-prior scoring into the live checked runtime path created in Phase 5. It must surface soft-prior assessments alongside deterministic hard verdict output, expose explainable advisory evidence in the manual check/API response, and prove through end-to-end tests that soft priors do not mutate hard verdict classification. It does not add project/user priors, new corpus-building semantics, automatic checks while drafting, or the Phase 8 inspection UI.

</domain>

<decisions>
## Implementation Decisions

### Runtime Integration Location
- **D-01:** Wire soft-prior evaluation as an optional advisory result on `executeVerdictRun`, then let `executeIngestionCheck` propagate that result through the manual check/API path.
- **D-02:** Keep hard verdict generation authoritative inside the existing verdict-run flow; soft-prior evaluation may annotate the returned runtime result but must not change saved hard verdict kinds, finding IDs, evidence snapshots, or run metadata semantics.

### Prior Snapshot Input
- **D-03:** Resolve prior snapshots through explicit runtime dependency/config such as `priorSnapshotDir` or `softPriorConfig`, not by assuming a committed `data/prior-snapshots/` tree always exists.
- **D-04:** Allow `snapshotSet` injection in tests and internal fixtures so API and service regressions can exercise deterministic prior artifacts without relying on global filesystem state.
- **D-05:** If prior snapshots are missing or disabled, return an explicit advisory unavailable state rather than failing the hard check or silently pretending no drift exists.

### API Response Contract
- **D-06:** Extend manual check responses with a separate `softPrior` advisory block instead of mixing soft-prior fields into hard verdict/run metadata.
- **D-07:** The `softPrior` block should expose status, assessment details, and repair plausibility adjustments. The minimum inspectable assessment includes drift scores, thresholds, triggered drifts, dominant prior layer, representative pattern summary, and contribution evidence.
- **D-08:** Preserve the existing top-level check fields (`sessionId`, `workflowState`, `storyId`, `revisionId`, `runId`, `previousRunId`) so Phase 5 API consumers remain compatible.

### Verification Criteria
- **D-09:** Use an API end-to-end regression through `submit -> extract -> review -> approve -> check` as the primary proof that soft-prior results surface in the live runtime flow.
- **D-10:** The primary E2E must prove that `softPrior.status === "available"` when configured snapshots are present, that advisory assessment and repair plausibility data are returned, and that hard verdict classification/run metadata remain unchanged by the soft-prior layer.
- **D-11:** Add focused service-level tests for `executeVerdictRun` and/or `executeIngestionCheck` as supporting coverage, but do not treat static `rg` wiring checks as sufficient completion proof for this runtime integration phase.

### the agent's Discretion
- Exact TypeScript names for the config/dependency objects and result DTOs, as long as the hard/soft contract remains explicit.
- Exact unavailable status shape, as long as clients can distinguish disabled/missing prior snapshots from an available assessment with no triggered drifts.
- Exact transition-building helper used to convert live canonical events into `SoftPriorTransitionInput`, as long as it is deterministic, schema-backed, and test-covered.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and Phase Contracts
- `.planning/PROJECT.md` - project philosophy, explainability requirement, and logic-led judgment boundary.
- `.planning/REQUIREMENTS.md` - `SOFT-01` remains pending for Phase 7 and defines the soft-prior runtime requirement.
- `.planning/ROADMAP.md` - fixed Phase 7 goal, success criteria, and three planned work slices.
- `.planning/STATE.md` - current blocker note that `evaluateSoftPriors` is not wired into the live verdict/manual-check runtime path.
- `.planning/v1.0-v1.0-MILESTONE-AUDIT.md` - milestone audit blocker proving why Phase 7 exists and what must be closed.

### Upstream Phase Decisions
- `.planning/phases/02-hard-constraint-engine/02-CONTEXT.md` - hard verdict semantics and deterministic rule-engine boundaries that soft priors must not override.
- `.planning/phases/03-evidence-and-repair-reasoning/03-CONTEXT.md` - repair ranking, evidence, rerun, and verdict-diff semantics that soft-prior advisory output should augment.
- `.planning/phases/04-corpus-priors-and-soft-pattern-layer/04-CONTEXT.md` - locked soft-prior math, layer separation, advisory boundary, and explainability requirements.
- `.planning/phases/04-corpus-priors-and-soft-pattern-layer/04-VERIFICATION.md` - explicit failed runtime wiring evidence for `SOFT-01`.
- `.planning/phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md` - manual check API flow, state machine, and approval-gated canonical promotion.
- `.planning/phases/05-natural-language-ingestion-and-review-api/05-VERIFICATION.md` - verified submit/review/approve/check behavior that Phase 7 must extend.

### Code Contracts
- `src/services/soft-prior-evaluator.ts` - existing `evaluateSoftPriors` orchestration that loads prior snapshots, scores drift, reranks repairs, and preserves `hardVerdictKind`.
- `src/services/verdict-runner.ts` - live hard verdict execution entrypoint selected as the integration location.
- `src/services/ingestion-check.ts` - manual check service that should propagate the optional advisory result.
- `src/api/routes/ingestion-check.ts` and `src/api/schemas.ts` - Fastify route and response schema that must expose the separate `softPrior` advisory block.
- `src/engine/prior-snapshot-loader.ts`, `src/engine/soft-prior-scoring.ts`, and `src/engine/repair-plausibility.ts` - existing prior loading, scoring, and repair adjustment implementation.
- `tests/api/check-controls-api.test.ts`, `tests/engine/soft-prior-scoring.test.ts`, `tests/engine/repair-plausibility.test.ts`, and `tests/fixtures/soft-prior-fixtures.ts` - current regression and fixture patterns to extend.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/services/soft-prior-evaluator.ts` exports `evaluateSoftPriors`, which already returns `assessment`, `rerankedRepairs`, `adjustments`, and `hardVerdictKind`.
- `src/engine/prior-snapshot-loader.ts` loads `baseline.prior.json` plus an optional genre-specific prior artifact from a configured snapshot directory.
- `src/engine/soft-prior-scoring.ts` already produces drift scores, thresholds, triggered drifts, contribution records, dominant prior layer, and representative pattern summaries.
- `src/engine/repair-plausibility.ts` already computes `RepairPlausibilityAdjustment` records and reranks repair candidates without altering hard validity.
- `tests/fixtures/soft-prior-fixtures.ts` can build deterministic prior artifacts and transition inputs suitable for API/service E2E fixtures.

### Established Patterns
- API boundaries use Zod schemas in `src/api/schemas.ts`, and routes parse/serialize through those schemas before sending responses.
- Fastify route tests use `app.inject()` with pg-mem-backed repositories, so Phase 7 can prove the check API contract without opening sockets.
- Service orchestration lives in `src/services`, while hard engine and prior math live under `src/engine`.
- The repository currently does not track `data/prior-snapshots/` artifacts, so runtime integration must support explicit configuration and deterministic test injection.
- Existing tests protect the Phase 5 rule that no verdict run occurs before approval and checks only run on explicit request.

### Integration Points
- Add optional soft-prior configuration to the verdict-run and/or API dependency boundary.
- Convert live canonical event/revision data into deterministic `SoftPriorTransitionInput` values before calling `evaluateSoftPriors`.
- Propagate advisory results from `executeVerdictRun` to `executeIngestionCheck` and then through `CheckIngestionResponseSchema`.
- Keep persisted hard verdict records and verdict run records compatible with earlier phases while adding only returned advisory runtime data unless planning finds an explicit need to persist soft-prior artifacts.

</code_context>

<specifics>
## Specific Ideas

- The user chose all recommended decisions for Phase 7.
- The runtime integration should close the audit blocker, not broaden the prior system.
- Soft prior output should be explicit enough for a writer or later inspection UI to understand which layer and representative pattern influenced the advisory result.
- Missing or disabled prior snapshots should be visible as advisory unavailability, not a hard-check failure.

</specifics>

<deferred>
## Deferred Ideas

- Project-specific and user-specific priors remain deferred beyond this phase.
- Raw prior pattern browsing and UI-heavy inspection remain deferred to Phase 8 or later.
- Automatic scheduled prior rebuilding remains deferred until manual snapshot workflows stabilize.
- Persisting soft-prior assessment history is not required unless Phase 7 planning finds it necessary for traceability without changing the existing hard verdict storage contract.

</deferred>

---

*Phase: 07-soft-prior-runtime-integration*
*Context gathered: 2026-04-10*
