---
phase: 04
slug: corpus-priors-and-soft-pattern-layer
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-10
---

# Phase 04 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Curated corpus records -> canonical normalization | Corpus source rows become runtime-usable transition data and must not introduce semantics the deterministic engine cannot interpret. | event IDs, event types, state transitions, preconditions, world-rule exceptions, world profile metadata |
| Offline analytics output -> runtime snapshot exports | Prior builds cross from offline corpus aggregation into runtime-loaded artifacts and must stay versioned and auditable. | snapshot IDs, layer identity, source work provenance, sample counts, baseline and genre artifacts |
| Prior snapshots -> soft reasoning surface | Advisory priors influence user-facing drift and repair ranking output and therefore must not mutate hard verdict truth or become opaque. | drift scores, thresholds, dominant layer, contribution evidence, representative pattern summaries, reranked repairs |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-04-01 | Tampering | Corpus normalization contract | mitigate | `CorpusWorkSchema` and `NormalizedCorpusTransitionSchema` constrain normalization to canonical event/state/world-rule exception structures, and regression coverage asserts canonical tokens plus preserved world-rule exceptions. | closed |
| T-04-02 | Repudiation | Prior snapshot provenance | mitigate | `PriorSnapshotSchema` plus `buildPriorSnapshots` emit immutable `snapshotId`, `sampleCount`, `sourceWorkIds`, and layer metadata, while export regressions verify auditable baseline and genre artifacts. | closed |
| T-04-03 | Elevation of Privilege | Soft-prior verdict influence | mitigate | `evaluateSoftPriors` passes `hardVerdictKind` through unchanged and soft priors only affect drift assessment plus repair reranking, with regression coverage asserting the hard verdict kind is preserved. | closed |
| T-04-04 | Repudiation | Soft-prior evidence opacity | mitigate | `SoftPriorAssessmentSchema` requires drift scores, thresholds, dominant layer, representative summaries, and contribution records, and the scorer/tests verify dominant-layer evidence plus confidence-sensitive thresholds. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-10 | 4 | 4 | 0 | Codex |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-10
