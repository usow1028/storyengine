# Pitfalls Research

**Domain:** story consistency engine / computational narrative reasoning
**Researched:** 2026-04-09
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Treating Corpus Frequency as Logical Truth

**What goes wrong:**
Common narrative patterns get promoted into hard rules, so rare but coherent stories are mislabeled as invalid.

**Why it happens:**
Teams conflate “often observed” with “must be true.”

**How to avoid:**
Separate hard constraints from weighted priors at the storage and solver layers.

**Warning signs:**
Soft narrative tendencies start appearing in “impossible” verdicts.

**Phase to address:**
Phase 4

---

### Pitfall 2: Letting the LLM Be the Final Judge

**What goes wrong:**
Verdicts become unstable and difficult to reproduce.

**Why it happens:**
LLM outputs are attractive because they are fast and fluent.

**How to avoid:**
Use LLMs only for extraction, explanation, and candidate generation; keep final verdict logic explicit and testable.

**Warning signs:**
Small wording changes produce different contradiction classes for the same underlying story.

**Phase to address:**
Phase 2

---

### Pitfall 3: No Explicit State Snapshots

**What goes wrong:**
Character drift, knowledge contradictions, and resource/location conflicts cannot be judged consistently.

**Why it happens:**
Teams store events only and assume state can always be reconstructed implicitly.

**How to avoid:**
Persist state deltas and reconstructable snapshots tied to each event boundary.

**Warning signs:**
You can explain a contradiction in prose, but cannot point to the exact state before and after the offending event.

**Phase to address:**
Phase 1

---

### Pitfall 4: World Rules Are Notes, Not Executable Constraints

**What goes wrong:**
Fantasy or SF exceptions exist in documentation but are not enforced during checking.

**Why it happens:**
Worldbuilding gets stored as lore text rather than executable rule data.

**How to avoid:**
Represent every operative exception as a versioned rule object the checker can evaluate.

**Warning signs:**
Reviewers keep saying “this should be allowed in this world” but the engine has no formal way to know why.

**Phase to address:**
Phase 2

---

### Pitfall 5: Verdicts Without Provenance

**What goes wrong:**
Writers cannot trust or fix judgments because the engine cannot show where they came from.

**Why it happens:**
Systems optimize for score display before evidence storage.

**How to avoid:**
Persist evidence spans, referenced states, violated rules, and candidate repairs with every verdict.

**Warning signs:**
The engine can say “inconsistent,” but cannot quote the linked events or state assumptions that produced the verdict.

**Phase to address:**
Phase 3

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing rule payloads only as freeform JSON | Fast iteration | Taxonomy drift and query pain | Acceptable only in prototype spikes with a migration plan |
| Using a single verdict enum for all failure types | Simpler API | Loses actionability and analytical value | Never, if repair guidance matters |
| Manual corpus tagging only | Quick start | Does not scale and creates taxonomy inconsistency | Acceptable for seed datasets only |
| Building UI first | Visible progress | Logic debt hidden behind polish | Never for this project’s first milestone |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| LLM extraction | Trusting raw JSON from the model | Validate against strict schemas and preserve extraction confidence |
| PostgreSQL + `jsonb` | Putting everything into giant blobs | Normalize stable entities and keep flexible annotations in `jsonb` only where needed |
| DuckDB corpus analysis | Treating offline counts as live truth | Export weighted priors deliberately and version them |
| Optional graph layer | Duplicating business truth | Use graph projection as a read model, not the source of truth |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-running full extraction on every edit | Slow author feedback | Version normalized fragments and re-check incrementally | Breaks once drafts or scenes grow large |
| Monolithic all-rules-at-once reasoning | Solver latency spikes | Partition rule packs by verdict family and story segment | Breaks when rule inventory grows materially |
| Corpus mining in the serving path | Verdict latency becomes erratic | Keep heavy mining offline and ship compact priors | Breaks as soon as corpus size becomes significant |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Prompt injection from imported manuscripts or notes | Extraction and explanation layers can be steered into bogus structure | Treat imported text as untrusted input and keep schema validation mandatory |
| Unversioned rule edits | Silent behavior changes in verdicts | Version rule packs and attach rule-set IDs to every verdict |
| Mixing user-private drafts with shared corpus mining naively | Data leakage | Separate private operational data from research corpora and require explicit opt-in |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing only a red/green result | Writers cannot revise effectively | Show violation class, evidence, and repair path |
| Forcing users to author structured JSON manually | High friction and abandonment | Allow natural language input and structured correction only when needed |
| Hiding uncertainty | Users over-trust weak verdicts | Distinguish hard contradiction, repairable gap, and soft drift clearly |

## "Looks Done But Isn't" Checklist

- [ ] **Hard checker:** Often missing explicit time and travel constraints — verify cross-location impossibility cases.
- [ ] **Character coherence:** Often missing knowledge-state and motive-state transitions — verify betrayal and secrecy cases.
- [ ] **World-rule system:** Often missing versioned overrides — verify a fantasy/SF exception can be declared and rechecked.
- [ ] **Verdict storage:** Often missing provenance — verify every violation links to exact rules and source events.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Corpus priors treated as hard rules | HIGH | Split rulesets, relabel verdicts, re-run regression fixtures |
| Prose-only storage | HIGH | Introduce canonical model migration and backfill extracted structure |
| Missing provenance | MEDIUM | Add verdict audit tables and rerun checks on saved story versions |
| UI-first drift | MEDIUM | Freeze UI work and complete the canonical model and rule engine first |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| No explicit state snapshots | Phase 1 | State before/after each event can be reconstructed |
| LLM as final judge | Phase 2 | Same story produces stable hard-verdict outputs across reruns |
| World rules not executable | Phase 2 | User rule overrides change verdicts deterministically |
| Verdicts without provenance | Phase 3 | Every violation cites rules, states, and source spans |
| Corpus frequency becomes law | Phase 4 | Soft priors never appear as hard contradictions |

## Sources

- https://arxiv.org/abs/2503.23512
- https://arxiv.org/abs/2603.05890
- https://arxiv.org/abs/2508.09848
- https://potassco.org/
- https://www.postgresql.org/docs/18/datatype-json.html

---
*Pitfalls research for: story consistency engine*
*Researched: 2026-04-09*
