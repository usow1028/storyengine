---
phase: 02
slug: hard-constraint-engine
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-09
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Canonical rules -> activation engine | Stored rule scope, target, active state, priority, and explicit rule changes are promoted from passive metadata into effective rule computation. | rule metadata, scopeTargetId, priority, event rule changes |
| Checker families -> verdict persistence | Family findings become persisted representative verdict evidence for later explanation and review workflows. | reason codes, representative checker, supporting findings, notEvaluated payloads |
| Regression corpus -> future verification | Shared fixture builders and engine-only commands define the canonical contradiction matrix future phases rely on. | canonical test graphs, override fixtures, regression commands |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-02-01 | Tampering | Rule scope activation contract | mitigate | Canonical rule metadata now requires explicit scope and optional `scopeTargetId`, and repository round-trips preserve the target binding instead of relying on heuristic matching. | closed |
| T-02-02 | Repudiation | Checker evidence payload | mitigate | Verdict evidence carries representative checker, reason code, supporting findings, and `notEvaluated` metadata inside one schema-tested payload that persists through the verdict repository. | closed |
| T-02-03 | Tampering | Rule activation resolver | mitigate | Effective rules are computed from persisted scope, target, active flag, and explicit event rule changes, with inactive local rules blocked until explicit activation. | closed |
| T-02-04 | Elevation of Privilege | Scope precedence engine | mitigate | Fixed scope precedence (`event > character > location > story > global`) is applied before same-scope priority so broader defaults cannot overrule narrower exceptions. | closed |
| T-02-05 | Repudiation | Representative verdict aggregation | mitigate | Representative verdict selection preserves sorted supporting findings plus skipped downstream checker metadata so short-circuit behavior remains auditable. | closed |
| T-02-06 | Repudiation | Regression fixture corpus | mitigate | Impossible travel, causal gaps, loyalty reversal, threat exception, and override scenarios are centralized in shared fixture builders reused across all Phase 2 regression suites. | closed |
| T-02-07 | Tampering | Phase 2 verification commands | mitigate | `test:engine` runs the full engine verification matrix in one non-watch command so later changes cannot silently drift verdict behavior without failing automation. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

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
