---
phase: 03
slug: evidence-and-repair-reasoning
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-09
---

# Phase 03 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Hard-engine findings -> persisted explanation evidence | Runtime findings become durable evidence snapshots and deterministic explanations that later phases will trust as audit records. | event summaries, state summaries, rule summaries, conflict path, missing premises, blocked checker metadata |
| Failing verdicts -> repair reasoning | Failing verdicts cross into typed repair generation and must remain suggestions rather than canonical truth. | reason codes, evidence snapshots, source finding IDs, confidence bands, repair payloads |
| Transient engine output -> verdict run history | Per-run verdicts cross into durable run-linked records that power rerun diffs and audit comparisons. | run IDs, previous run IDs, finding IDs, representative verdict changes, supporting finding deltas |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-03-01 | Tampering | Evidence snapshot assembly | mitigate | Evidence snapshots are assembled from canonical graph events, boundary facts, representative/supporting findings, and resolved active rules only. | closed |
| T-03-02 | Repudiation | Deterministic explanation output | mitigate | Structured evidence is persisted under the verdict schema and rendered through a deterministic explanation composer so reruns do not rely on mutable freeform text. | closed |
| T-03-03 | Integrity | Repair-family selection | mitigate | Repair generation is constrained by reason-code taxonomy, so only allowed repair families are emitted for each failure mode. | closed |
| T-03-04 | Repudiation | Repair deduplication and ranking | mitigate | Candidate deduplication uses normalized fingerprints while preserving `sourceFindingIds`, then assigns confidence bands from deterministic ranking metrics. | closed |
| T-03-05 | Repudiation | Verdict run history | mitigate | Verdict runs are stored in an explicit `verdict_runs` table and verdict rows are linked to `run_id`, preserving prior audit records across reruns. | closed |
| T-03-06 | Tampering | Rerun diff identity | mitigate | Stable `findingId` and supporting-finding fingerprints derive from checker, reason code, and evidence fields rather than explanation wording. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-09 | 6 | 6 | 0 | Codex |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-09
