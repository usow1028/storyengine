---
phase: 01
slug: canonical-narrative-schema
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-09
---

# Phase 01 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Narrative input -> canonical domain | User-authored assumptions and normalization output enter the canonical validation layer. | entity IDs, state slots, event effects, rule text |
| Canonical domain -> persistence | Canonical records cross into PostgreSQL repositories and migrations. | story revisions, entities, boundaries, events, rules, verdicts, provenance |
| Persistence -> reconstruction | Stored canonical facts become user-visible boundary answers. | reconstructed location, knowledge, goals, provenance, source event IDs |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-01-01 | Tampering | Canonical domain schema | mitigate | Zod-backed runtime validation and typed canonical modules reject malformed entities, states, events, and rules. | closed |
| T-01-02 | Repudiation | Verdict and violation taxonomy naming | mitigate | Verdict kinds and violation categories are centralized in one exported module and covered by schema tests. | closed |
| T-01-03 | Tampering | Canonical persistence schema | accept | Some optional and cross-record references remain non-FK text columns in Phase 1; repository validation and tests are accepted as the interim control. | closed |
| T-01-04 | Repudiation | Provenance trail | mitigate | Provenance records and revision lineage persist with canonical objects and are round-tripped in storage tests. | closed |
| T-01-05 | Denial of Service | jsonb extension payloads | accept | Several list-shaped query axes remain in bounded jsonb columns in Phase 1; normalization/index strategy is deferred beyond the schema bootstrap. | closed |
| T-01-06 | Tampering | State reconstruction pipeline | mitigate | Snapshot rebuilding replays only stored canonical boundaries and event deltas for a selected revision. | closed |
| T-01-07 | Information Disclosure | Boundary query results | mitigate | Boundary queries are revision-aware and return provenance/source event IDs tied to the selected boundary. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-01-03 | Foreign keys for several optional reference columns were deferred to keep the Phase 1 canonical schema adaptable while the hard-constraint model is still unsettled. | user | 2026-04-09 |
| AR-02 | T-01-05 | Knowledge, goals, loyalties, resources, conditions, and some actor/target sets remain bounded jsonb arrays in Phase 1 to preserve delivery speed before access patterns are finalized. | user | 2026-04-09 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-09 | 7 | 7 | 0 | Codex |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-09
