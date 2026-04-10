---
phase: "07"
slug: soft-prior-runtime-integration
status: verified
threats_open: 0
asvs_level: 1
block_on: high
created: 2026-04-10
updated: 2026-04-10
auditor: "Codex (gsd-security-auditor)"
---

# Phase 07 - Security

Phase 07 planned threats were verified only against the declared threat register. Implementation files were read-only during this audit.

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Server config -> soft-prior loader | `snapshotDir`, `snapshotSet`, `genreWeights`, and `worldProfile` are trusted runtime dependencies, not request payload fields. | Prior runtime config |
| Prior artifact JSON -> runtime evaluator | Snapshot artifacts are untrusted file contents until parsed by existing schemas and wrapped by advisory status handling. | Prior snapshot artifacts |
| Advisory evaluator -> hard verdict persistence | Soft-prior scores return in runtime/API output only and must not mutate hard verdict rows or verdict-run metadata. | Advisory assessment and repair ranking |
| API request -> server dependency config | Users can submit/check ingestion sessions, but prior snapshot config stays outside request payload schemas. | API body and server dependencies |

## Threat Register

| Threat ID | Category | Component | Disposition | Status | Evidence |
|-----------|----------|-----------|-------------|--------|----------|
| T-07-01 | Tampering / Information Disclosure | `SoftPriorRuntimeConfig.snapshotDir` | mitigate | CLOSED | `SoftPriorRuntimeConfig` is server/runtime config only in `src/services/soft-prior-runtime.ts:15`; verdict runner accepts it on trusted input in `src/services/verdict-runner.ts:35`; API dependency boundary carries it in `src/api/app.ts:27`. `rg "data/prior-snapshots"` returned no matches in audited implementation/API files. |
| T-07-02 | Tampering | `loadPriorSnapshotSet` and malformed prior artifacts | mitigate | CLOSED | `evaluateConfiguredSoftPrior` catches evaluator/loader errors and returns `invalid_snapshot` in `src/services/soft-prior-runtime.ts:205`; malformed JSON regression resolves to `invalid_snapshot` in `tests/services/soft-prior-runtime.test.ts:196`. |
| T-07-03 | Denial of Service | Missing prior artifacts | mitigate | CLOSED | Missing config returns `missing_snapshot` in `src/services/soft-prior-runtime.ts:178`; `ENOENT` is classified in `src/services/soft-prior-runtime.ts:89` and returned at `src/services/soft-prior-runtime.ts:206`; runtime and service tests cover no-source/empty-dir paths in `tests/services/soft-prior-runtime.test.ts:185` and `tests/services/ingestion-check-soft-prior.test.ts:139`. |
| T-07-04 | Tampering | Hard verdict records and run metadata | mitigate | CLOSED | `verdictRepository.saveMany(verdicts)` runs before advisory generation in `src/services/verdict-runner.ts:155`; `evaluateConfiguredSoftPrior` follows at `src/services/verdict-runner.ts:157`; persisted hard projections are compared in `tests/engine/verdict-runner.test.ts:218` and `tests/api/check-controls-api.test.ts:418`. |
| T-07-05 | Information Disclosure | Returned advisory object | mitigate | CLOSED | Advisory result types expose only `assessment`, `rerankedRepairs`, and `repairPlausibilityAdjustments` in `src/services/soft-prior-runtime.ts:31`; final return preserves only those fields in `src/services/soft-prior-runtime.ts:221`. `rg "sourceWorkIds"` returned no matches in audited runtime/API response files. |
| T-07-06 | Tampering / Information Disclosure | Fastify check route and schemas | mitigate | CLOSED | Prior config is accepted only on `StoryGraphApiDependencies.softPriorConfig` in `src/api/app.ts:27`; check route passes server dependencies into service in `src/api/routes/ingestion-check.ts:16`; request schemas contain no prior config fields in `src/api/schemas.ts:12`. `rg "snapshotDir|snapshotSet|genreWeights|worldProfile"` returned no matches in audited API schema/route source files. |
| T-07-07 | Spoofing / Tampering | API check response | mitigate | CLOSED | Check response keeps hard fields and nests advisory output under `softPrior` in `src/api/schemas.ts:97`; route parses the service result with that schema in `src/api/routes/ingestion-check.ts:17`; API E2E asserts top-level fields and separate `softPrior.status` in `tests/api/check-controls-api.test.ts:388`. |
| T-07-08 | Information Disclosure | `softPrior.assessment.contributions` | mitigate | CLOSED | Response schema uses domain advisory schemas, not raw artifact schemas, in `src/api/schemas.ts:75`; E2E asserts contribution summaries and repair advisory fields in `tests/api/check-controls-api.test.ts:402`; `rg "sourceWorkIds"` returned no matches in audited response/runtime files. |
| T-07-09 | Denial of Service | Missing/disabled snapshot config | mitigate | CLOSED | Service tests prove disabled and missing snapshots still return `workflowState: "checked"` in `tests/services/ingestion-check-soft-prior.test.ts:119` and `tests/services/ingestion-check-soft-prior.test.ts:139`; run persistence and `lastVerdictRunId` are asserted in `tests/services/ingestion-check-soft-prior.test.ts:105`. |
| T-07-10 | Tampering | Zod response parsing | mitigate | CLOSED | `SoftPriorAdvisoryResponseSchema` is defined in `src/api/schemas.ts:75` and included in `CheckIngestionResponseSchema` at `src/api/schemas.ts:104`; parser retention is asserted in `tests/api/check-controls-api.test.ts:439`. |
| T-07-11 | Tampering | API E2E prior configuration | mitigate | CLOSED | API E2E injects `softPriorConfig` through `buildStoryGraphApi` dependencies in `tests/api/check-controls-api.test.ts:129`; submitted/extract/patch request payloads do not carry trusted prior config in `tests/api/check-controls-api.test.ts:143`; hostile prior fields are stripped and asserted absent in `tests/api/check-controls-api.test.ts:451`. |
| T-07-12 | Spoofing / Tampering | Advisory output semantics | mitigate | CLOSED | E2E asserts `softPrior.status === "available"` under the advisory block in `tests/api/check-controls-api.test.ts:396`; persisted hard verdict/run projections are compared against disabled-prior runs in `tests/api/check-controls-api.test.ts:417`. |
| T-07-13 | Information Disclosure | API response evidence | mitigate | CLOSED | E2E asserts explainable advisory summaries only: drift scores, thresholds, triggered drifts, dominant layer, representative summary, contributions, reranked repairs, and plausibility adjustments in `tests/api/check-controls-api.test.ts:402`; `rg "sourceWorkIds"` returned no matches in audited response/runtime files. |
| T-07-14 | Denial of Service | Runtime prior load path | mitigate | CLOSED | Missing snapshots are covered by the service unavailable tests in `tests/services/ingestion-check-soft-prior.test.ts:139`; primary API E2E uses injected `snapshotSet` from server-side fixture construction in `tests/api/check-controls-api.test.ts:74` and `tests/api/check-controls-api.test.ts:372`, avoiding filesystem-fragile proof. |
| T-07-15 | Repudiation | `SOFT-01` closure evidence | mitigate | CLOSED | Current audit executed `npm run typecheck && npm run test:priors && npm run test:ingestion` successfully: `test:priors` passed 4 files / 9 tests and `test:ingestion` passed 5 files / 10 tests. Current audit also executed the Phase 07 targeted Vitest command: 4 files / 14 tests passed. |

Status: closed = declared mitigation found and verified.  
Disposition: all Phase 07 threats are `mitigate`; no `accept` or `transfer` threats were declared.

## Unregistered Flags

None. `rg '^## Threat Flags|Threat Flags'` across `07-01-SUMMARY.md`, `07-02-SUMMARY.md`, and `07-03-SUMMARY.md` returned no matches, consistent with the provided `summary_threat_flags: none found`.

## Accepted Risks Log

No accepted risks.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By | Verification |
|------------|---------------|--------|------|--------|--------------|
| 2026-04-10 | 15 | 15 | 0 | Codex (gsd-security-auditor) | `npm run typecheck && npm run test:priors && npm run test:ingestion`; `npm run test -- tests/services/soft-prior-runtime.test.ts tests/services/ingestion-check-soft-prior.test.ts tests/engine/verdict-runner.test.ts tests/api/check-controls-api.test.ts`; targeted `rg` evidence checks |

## Verification Commands

| Command | Result |
|---------|--------|
| `npm run typecheck && npm run test:priors && npm run test:ingestion` | PASS. `test:priors`: 4 files / 9 tests. `test:ingestion`: 5 files / 10 tests. Final exit code 0, so `typecheck` also passed. |
| `npm run test -- tests/services/soft-prior-runtime.test.ts tests/services/ingestion-check-soft-prior.test.ts tests/engine/verdict-runner.test.ts tests/api/check-controls-api.test.ts` | PASS. 4 files / 14 tests. |
| `rg "sourceWorkIds"` over audited runtime/API response files | PASS. No matches. |
| `rg "data/prior-snapshots"` over audited runtime/API files | PASS. No matches. |
| `rg "snapshotDir\|snapshotSet\|genreWeights\|worldProfile"` over audited API schema/route source files | PASS. No matches. |

## Sign-Off

- [x] All threats have a disposition.
- [x] All declared mitigations were verified against code, tests, or audit commands.
- [x] Accepted risks log reviewed; no accepted risks apply.
- [x] `threats_open: 0` confirmed.
- [x] `status: verified` set in frontmatter.

Approval: verified 2026-04-10
