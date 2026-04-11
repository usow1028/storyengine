# Phase 11: Scoped Checks and Revision Diff - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 11-scoped-checks-and-revision-diff
**Areas discussed:** Scope reference 방식, Scoped check 승인 게이트, Diff 비교 기준, Cross-revision scope matching, Diff/trace 출력 밀도

---

## Scope reference 방식

| Option | Description | Selected |
|--------|-------------|----------|
| `scopeId only` | Persisted `scopeId`만 받아 scoped check/diff를 실행한다. | ✓ |
| `inline scope object only` | 요청마다 scope 내용을 직접 보낸다. | |
| `both` | 기본은 `scopeId`, 필요시 inline scope도 허용한다. | |

**User's choice:** `scopeId only`
**Notes:** Public contract는 persisted scope identity를 기준으로 유지한다.

---

## Scoped check 승인 게이트

| Option | Description | Selected |
|--------|-------------|----------|
| 요청한 scope만 `approved/current`면 실행 | 세션 전체가 아니라 선택한 scope 집합만 승인 상태를 검증한다. | ✓ |
| 세션 전체가 `approved/current`여야 실행 | scoped check라도 전체 세션 승인 상태를 요구한다. | |
| best-effort 실행 | 승인된 부분만 골라 실행하고 나머지는 경고만 남긴다. | |

**User's choice:** 요청한 scope만 `approved/current`면 실행
**Notes:** Scoped check는 실제 partial progress를 열어야 하지만 fail-closed를 유지해야 한다.

---

## Diff 비교 기준

| Option | Description | Selected |
|--------|-------------|----------|
| 기본은 직전 run + 필요시 explicit 비교 지원 | 기본 UX는 `previousRunId`, 필요하면 base run/revision을 직접 지정한다. | ✓ |
| 직전 run만 지원 | 항상 immediately previous run만 비교한다. | |
| 항상 explicit 비교만 지원 | 모든 diff 요청이 비교 대상을 직접 지정해야 한다. | |

**User's choice:** 기본은 직전 run + 필요시 explicit 비교 지원
**Notes:** Existing run-chain UX를 살리되 revision diff도 막지 않는다.

---

## Cross-revision scope matching

| Option | Description | Selected |
|--------|-------------|----------|
| persisted `scopeId` 또는 section identity 기준만 허용 | deterministic identity가 있는 scope만 cross-revision diff를 허용한다. | ✓ |
| `sourceTextRef` overlap 기반 best-effort 매칭도 허용 | source span 겹침으로 유연하게 비교한다. | |
| 사용자가 비교 scope 쌍을 직접 지정 | 자동 매칭 대신 양쪽 scope를 모두 지정하게 한다. | |

**User's choice:** persisted `scopeId` 또는 section identity 기준만 허용
**Notes:** Phase 11에서는 fuzzy matching을 열지 않고 deterministic identity만 허용한다.

---

## Diff/trace 출력 밀도

| Option | Description | Selected |
|--------|-------------|----------|
| finding-level trace 포함 | diff 항목별로 scope, segment/source, rule 연결 정보를 직접 담는다. | ✓ |
| run-level summary 위주 | 대표 변화와 added/resolved/persisted 정도만 담는다. | |
| full evidence payload 포함 | diff 응답에 evidence/supportingFindings까지 거의 전부 넣는다. | |

**User's choice:** finding-level trace 포함
**Notes:** TRACE-01을 Phase 11에서 직접 충족하되, full inspection dump까지는 가지 않는다.

---

## the agent's Discretion

- Exact DTO field names and route names for scoped check and diff requests
- Exact persistence shape for run-to-scope metadata
- Exact conflict/error wording and diff envelope structure

## Deferred Ideas

- `sourceTextRef` overlap based best-effort matching
- Full inspection-payload evidence dumps in diff responses
- Large-run diff exploration UI
