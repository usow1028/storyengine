# Phase 3: Evidence and Repair Reasoning - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 03-evidence-and-repair-reasoning
**Areas discussed:** evidence exposure, repair family scope, repair ranking, rerun diff scope, repair concreteness, repair search scope, rerun finding identity, evidence/repair inference boundary, evidence storage, repair composition, candidate count, rerun baseline, repair targets, prior-event insertion, repair confidence, not-evaluated handling, state evidence granularity, repair deduplication, rerun recording unit, explanation rendering

---

## Evidence Exposure

| Option | Description | Selected |
|--------|-------------|----------|
| Reference-only | Show IDs, reason code, and a short explanation only | |
| Structured explanation | Show IDs, reason code, summaries, conflict or missing-cause path, and missing-premise summary | ✓ |
| Proof-trace style | Expose checker steps and near-complete derivation trace | |

**User's choice:** Structured explanation  
**Notes:** The user wanted verdicts to be explainable like engineering inspection output without going all the way to formal proof traces.

---

## Repair Family Scope

| Option | Description | Selected |
|--------|-------------|----------|
| All families for all failures | Always generate assumptions, prior events, and rule declarations together | |
| Reason-specific families | Generate repair families according to verdict kind and reason taxonomy | ✓ |
| Single family per failure | Lock each failure type to only one repair family | |

**User's choice:** Reason-specific families  
**Notes:** Repair suggestions should stay tightly connected to the reason taxonomy rather than becoming generic brainstorming.

---

## Repair Ranking

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal change first | Prefer the smallest number of edits regardless of story fit | |
| Plausibility first | Prefer the most natural-looking story repair first | |
| Layered ranking | Rank by minimal change, then fit with the current story/world, then locality | ✓ |

**User's choice:** Layered ranking  
**Notes:** The user wanted repair ranking kept separate from validity so a plausible fix never looks like current truth.

---

## Rerun Diff Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Representative verdict only | Compare only the headline verdict before and after | |
| Representative + supporting findings | Compare the headline verdict and supporting finding changes | ✓ |
| Full output delta | Compare verdicts, supporting findings, repairs, and evidence payload changes | |

**User's choice:** Representative + supporting findings  
**Notes:** Enough detail is needed to see why things changed, but Phase 3 should not overbuild full payload diffing yet.

---

## Repair Concreteness

| Option | Description | Selected |
|--------|-------------|----------|
| Abstract suggestion | Suggest broad classes such as “add setup” or “declare a rule” | |
| Typed repair object | Produce structured repair objects with renderable summaries | ✓ |
| Canonical patch draft | Produce near-insertable canonical events or rules directly | |

**User's choice:** Typed repair object  
**Notes:** Repair needs to be actionable but still clearly remain a suggestion instead of an auto-applied truth.

---

## Repair Search Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Local failing path only | Search around the failing path and its nearby state/rule context | ✓ |
| Whole revision | Search the whole revision for possible repairs | |
| Revision plus similar cases | Search the revision and prior/similar cases | |

**User's choice:** Local failing path only  
**Notes:** The user preferred explainable, locally grounded repairs over broad speculative search.

---

## Rerun Finding Identity

| Option | Description | Selected |
|--------|-------------|----------|
| Reason code + event IDs | Match issues using the reason code and related events | |
| Stable finding ID | Use a deterministic finding identifier across reruns | ✓ |
| Semantic matching | Use looser similarity to decide whether findings are “the same” | |

**User's choice:** Stable finding ID  
**Notes:** Deterministic diffing matters more than flexible semantic grouping at this stage.

---

## Evidence and Repair Inference Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Evidence-bound only | Allow only repairs directly visible from evidence with no extra inference | |
| Evidence-first with limited inference | Start from evidence and allow only taxonomy-approved limited inference | ✓ |
| Broader inference | Allow wider speculative repair reasoning | |

**User's choice:** Evidence-first with limited inference  
**Notes:** The user accepted narrow inference as long as it stays bounded by the reason taxonomy.

---

## Evidence Storage

| Option | Description | Selected |
|--------|-------------|----------|
| Store references only | Persist IDs and reconstruct detailed evidence later | |
| Structured evidence snapshot | Persist structured evidence at verdict time | ✓ |
| Persist all intermediates | Store raw intermediate checker outputs and traces | |

**User's choice:** Structured evidence snapshot  
**Notes:** Past verdicts should remain explainable even after later reruns or model evolution.

---

## Repair Composition

| Option | Description | Selected |
|--------|-------------|----------|
| Always single repair | Every candidate is exactly one repair object | |
| Single by default, limited bundle | Default to one repair object, permit small bundles only when taxonomy allows | ✓ |
| Bundle-first | Regularly generate multi-step repair bundles | |

**User's choice:** Single by default, limited bundle  
**Notes:** Explainability should dominate over aggressive combinatorial repair generation.

---

## Candidate Count

| Option | Description | Selected |
|--------|-------------|----------|
| Top 3 | Show only the three strongest repair options | ✓ |
| Top 5 | Show five options per failing verdict | |
| Threshold-based count | Show as many as clear a score threshold | |

**User's choice:** Top 3  
**Notes:** The user preferred a narrow, interpretable set of repair suggestions.

---

## Rerun Baseline

| Option | Description | Selected |
|--------|-------------|----------|
| Previous run only | Compare only against the immediately previous verdict run | ✓ |
| Previous + user-picked historical run | Allow one prior user-chosen comparison target | |
| Arbitrary historical comparison | Allow any run-to-run comparison | |

**User's choice:** Previous run only  
**Notes:** Phase 3 should keep diff semantics simple and deterministic.

---

## Repair Targets

| Option | Description | Selected |
|--------|-------------|----------|
| Representative failure only | Generate repairs only for the representative failing verdict | |
| Representative + repairable supporting findings | Generate repairs for the representative verdict and for supporting findings only when repairable | ✓ |
| Every failing finding | Generate repairs for every failing finding | |

**User's choice:** Representative + repairable supporting findings  
**Notes:** This keeps useful secondary repair paths without flooding the output.

---

## Prior-Event Insertion

| Option | Description | Selected |
|--------|-------------|----------|
| Immediately before contradiction | Insert the prior event directly before the contradicted event | |
| At the causal-path break point | Insert the prior event where the causal path actually becomes insufficient | ✓ |
| Time-window placement | Choose insertion by available time window first | |

**User's choice:** At the causal-path break point  
**Notes:** The user wanted prior-event repairs to target the actual missing-cause location, not just the nearest event boundary.

---

## Repair Confidence

| Option | Description | Selected |
|--------|-------------|----------|
| Rank only | Show order without confidence signals | |
| Rank + confidence band | Show ranked candidates with coarse confidence bands | ✓ |
| Rank + numeric score | Show explicit numeric scores alongside ranking | |

**User's choice:** Rank + confidence band  
**Notes:** Confidence should be visible, but not over-quantified.

---

## Not-Evaluated Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Explanation only, no repair | Show blocked downstream analyses but do not generate repairs for them | ✓ |
| Hide entirely | Omit blocked analyses from explanation and repair output | |
| Separate blocked findings | Represent blocked analyses as explicit standalone findings | |

**User's choice:** Explanation only, no repair  
**Notes:** The user wanted blocked checks to stay visible for explainability without pretending they were separately repairable.

---

## State Evidence Granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Relevant state axes only | Store only the state axes directly involved in the verdict | |
| Relevant axes + immediate prior change | Store relevant axes and the immediately preceding change that made them relevant | ✓ |
| Relevant axes + longer lineage summary | Store relevant axes plus a broader state-history summary | |

**User's choice:** Relevant axes + immediate prior change  
**Notes:** The user wanted enough context to explain a state contradiction without dumping long history into every verdict.

---

## Repair Deduplication

| Option | Description | Selected |
|--------|-------------|----------|
| Keep per-finding repairs separate | Leave similar repair proposals duplicated under each finding | |
| Merge duplicates and keep provenance | Show one merged repair candidate while preserving all source findings internally | ✓ |
| Merge without provenance | Collapse duplicates and discard detailed source lineage | |

**User's choice:** Merge duplicates and keep provenance  
**Notes:** Repair output should stay concise, but auditability must remain intact.

---

## Rerun Recording Unit

| Option | Description | Selected |
|--------|-------------|----------|
| One run per revision | Overwrite or collapse checks at the revision level | |
| One run per execution | Record each evaluation execution as its own verdict run | ✓ |
| Manual reruns only | Record only explicit user-triggered reruns | |

**User's choice:** One run per execution  
**Notes:** The user wants rerun and diff behavior to remain auditable at execution granularity.

---

## Explanation Rendering

| Option | Description | Selected |
|--------|-------------|----------|
| Reason template | Use fixed templates keyed only by reason code | |
| Deterministic evidence composition | Build explanation sentences from structured evidence fields deterministically | ✓ |
| LLM phrasing | Use model assistance to phrase explanations | |

**User's choice:** Deterministic evidence composition  
**Notes:** Explanation output should remain logic-led and reproducible rather than black-box phrasing.

---

## the agent's Discretion

- Exact stable-finding fingerprint composition
- Exact confidence-band thresholds derived from internal ranking
- Exact typed repair object schema per reason family
- Exact evidence snapshot field layout

## Deferred Ideas

- Corpus-backed plausibility priors for repair ranking
- LLM paraphrase of deterministic explanations
- Historical diff against arbitrary older runs
- Full proof-trace storage and rendering

---

*Phase: 03-evidence-and-repair-reasoning*
*Discussion log generated: 2026-04-09*
