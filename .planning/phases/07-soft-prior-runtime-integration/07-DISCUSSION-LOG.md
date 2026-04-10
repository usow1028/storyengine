# Phase 7: Soft-Prior Runtime Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md; this log preserves the alternatives considered.

**Date:** 2026-04-10T12:58:46+09:00
**Phase:** 07-soft-prior-runtime-integration
**Areas discussed:** Runtime integration location, Prior snapshot input, API response contract, Verification criteria

---

## Runtime Integration Location

| Option | Description | Selected |
|--------|-------------|----------|
| `executeVerdictRun` integration | Attach optional soft-prior advisory results to the common verdict-run path, then propagate through ingestion check and future checked flows. | yes |
| `executeIngestionCheck` only | Faster for the current API route, but leaves the verdict runner unaware of soft-prior output and repeats work for future checked paths. | no |
| Separate orchestration service | Clean separation, but likely too much abstraction for the current service structure. | no |

**User's choice:** `1`
**Notes:** User selected the recommended common verdict-run integration path.

---

## Prior Snapshot Input

| Option | Description | Selected |
|--------|-------------|----------|
| Dependency/config injection | Configure runtime snapshot directory or soft-prior settings explicitly; allow unavailable advisory status when snapshots are missing. | yes |
| Fixed default path | Always read `data/prior-snapshots/`; simple but brittle because the repo currently has no committed snapshot artifacts. | no |
| `snapshotSet` injection first | Convenient for tests but less aligned with real file-based snapshot operation. | no |

**User's choice:** `1`
**Notes:** User selected explicit runtime configuration with fixture injection available for tests.

---

## API Response Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Separate advisory block | Preserve existing run metadata and add a separate `softPrior` block with status, assessment, and repair adjustments. | yes |
| Direct top-level fields | Simpler but weakens the visible boundary between hard output and advisory output. | no |
| Attach soft priors per verdict | Fine-grained, but complex for first integration and risks blending soft-prior evidence into hard verdict records. | no |

**User's choice:** `1`
**Notes:** User selected a separate `softPrior` advisory block.

---

## Verification Criteria

| Option | Description | Selected |
|--------|-------------|----------|
| API E2E first | Prove `submit -> extract -> review -> approve -> check` returns available soft-prior output while hard classification remains stable. | yes |
| Service-unit tests first | Fast and narrow, but does not fully prove the Fastify API contract. | no |
| Documentation/rg checks first | Useful as supporting evidence, but insufficient for a runtime integration phase. | no |

**User's choice:** `1`
**Notes:** User selected API end-to-end regression as the primary completion proof, with service tests as support.

---

## the agent's Discretion

- Exact naming for configuration objects, DTOs, and unavailable status values.
- Exact helper shape for deriving `SoftPriorTransitionInput` from live canonical event/revision data.
- Exact split between API-level and service-level test files, provided the E2E runtime proof is present.

## Deferred Ideas

- Project/user priors.
- Raw prior pattern browsing or inspection UI.
- Automatic scheduled prior rebuilds.
- Persisted soft-prior assessment history unless planning identifies a traceability need.
