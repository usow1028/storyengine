# Phase 10: Incremental Extraction and Review Resilience - Research

**Researched:** 2026-04-11
**Domain:** draft-scale ingestion retry semantics, partial review safety, provenance-backed approval idempotency, honest operational state
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

Source: [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md]

### Locked Decisions

#### Extraction Targeting and Retry
- **D-01:** Selected extraction and retry should target explicit `segmentId[]` values. Whole-session extraction remains the default when no selection is provided, but partial reruns use concrete segment IDs rather than fuzzy text filters or chapter-scope shortcuts.
- **D-02:** Retrying extraction must replace extraction results only for the targeted segments. Untargeted segments, especially already-approved ones, must remain untouched.
- **D-03:** Each segment should persist attempt-oriented metadata needed for resilient review: attempt count, last extraction timestamp, last failure reason or error summary, and whether the latest extraction is stale or current.

#### Review State and Staleness
- **D-04:** Any boundary edit or extraction retry that changes a segment after review must mark only that segment stale or review-required. The whole session should not be reset if unaffected segments remain valid.
- **D-05:** Approved segments are not silently mutable. If an approved segment is retried or materially edited, its approval must be cleared and it must be re-approved explicitly before contributing to a fully approved session again.
- **D-06:** Session state should aggregate mixed segment outcomes honestly. Phase 10 should support explicit partial-extraction and partial-approval semantics instead of collapsing everything into a single optimistic session state.

#### Approval and Promotion Guardrails
- **D-07:** Segment approval remains segment-scoped and idempotent. Re-approving an unchanged approved segment must not duplicate canonical promotion or provenance writes.
- **D-08:** Canonical promotion still happens only for approved segments. Partial approval is allowed, but the existing full-session `/check` gate must remain blocked until Phase 11 adds explicit approved-scope checks.
- **D-09:** Retry and correction flows must preserve provenance lineage per segment: extracted payload, corrected payload, source spans, and retry history remain auditable.

#### API and Operational Shape
- **D-10:** Keep the Phase 5 mental model `submit -> extract -> review -> approve -> check`, but extend the extract and read responses with additive per-segment retry, error, and staleness fields.
- **D-11:** Keep Phase 10 request-driven in the current Fastify plus service plus repository architecture. Do not introduce background workers or queue-only lifecycle management in this phase.
- **D-12:** Selected extraction should extend the existing extract route and schemas rather than introducing a separate draft-processing workflow surface.

### Claude's Discretion

- Exact naming for new workflow states and per-segment retry or stale metadata, as long as they stay additive and explicit.
- Whether targeted extraction accepts only `segmentId[]` or internally supports section or range expansion, as long as `segmentId` remains the stable public selection unit in Phase 10.
- Exact HTTP conflict semantics for retrying approved or stale segments, as long as the implementation prevents silent overwrite of approved state.

### Deferred Ideas (OUT OF SCOPE)

- Approved-scope check execution and richer scope selectors beyond explicit segment targeting - Phase 11.
- Revision-to-revision diffing and cross-revision retry reconciliation - Phase 11.
- Inspection grouping, filtering, and large-run UI affordances - Phase 12.
- Background queue or worker orchestration for extraction retries - future work if request-driven lifecycle proves insufficient.
- Multi-user review locking or collaboration semantics - future milestone.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DRAFT-01 | User can submit chapter-scale draft text as an ordered document, chapter, and segment set instead of a single scene blob. | Phase 10 does not re-solve draft modeling, but it must preserve Phase 9가 만든 stable `segmentId`, `draftPath`, `sourceTextRef`를 retry/patch/approval 전 과정에서 깨뜨리지 않아야 한다. [CITED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md] [VERIFIED: src/services/ingestion-session.ts] |
| DRAFT-04 | System can extract, retry, and report status for selected draft segments independently. | `/extract` 요청을 additive `segmentId[]` 대상으로 확장하고, 세그먼트별 attempt ledger, failure summary, stale marker, current snapshot을 함께 보존해야 한다. [CITED: .planning/REQUIREMENTS.md] [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md] [VERIFIED: src/api/routes/ingestion-extract.ts] [VERIFIED: src/api/schemas.ts] [VERIFIED: src/storage/repositories/ingestion-session-repository.ts] |
| REVIEW-01 | User can approve safe segments while leaving uncertain or failed segments unresolved without corrupting canonical state. | 승인되지 않은 세그먼트만 canonical promotion 대상이어야 하고, 승인된 세그먼트의 retry/경계 수정은 approval clear를 동반해야 하며, `/check`는 계속 full-session approved 상태만 허용해야 한다. [CITED: .planning/REQUIREMENTS.md] [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md] [VERIFIED: src/services/ingestion-review.ts] [VERIFIED: src/services/ingestion-check.ts] |
| REVIEW-02 | User can see which entities, events, state boundaries, causal links, and rules came from each draft segment before promotion. | 현재 후보/segment snapshot 구조와 provenance detail을 유지하면서 retry lineage를 추가해, “현재 후보”와 “이전 시도”를 모두 추적 가능하게 해야 한다. [CITED: .planning/REQUIREMENTS.md] [VERIFIED: src/domain/ingestion.ts] [VERIFIED: src/services/ingestion-review.ts] [VERIFIED: src/storage/repositories/provenance-repository.ts] |
| OPER-01 | Long-running or partially failed draft analysis reports resumable progress and failure state instead of appearing complete. | 세그먼트별 `attemptCount`, `lastAttemptStatus`, `lastFailureSummary`, `stale`/`staleReason`와 session aggregate summary가 필요하며, 현재 shared workflow enum만으로는 이를 솔직하게 표현하기 어렵다. [CITED: .planning/REQUIREMENTS.md] [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md] [VERIFIED: src/domain/ingestion.ts] [VERIFIED: src/storage/repositories/ingestion-session-repository.ts] |
</phase_requirements>

## Summary

Phase 10은 새 ingestion 서브시스템을 만드는 작업이 아니라, 이미 존재하는 “latest snapshot” ingestion 흐름을 실패와 재시도에 강하도록 바꾸는 작업이다. 현재 코드베이스는 Phase 9 덕분에 stable `segmentId`, `draftPath`, `sourceTextRef`, `scope`를 이미 갖고 있고, Phase 5/9 구현은 segment-level approval과 provenance-backed promotion도 이미 수행한다. 비어 있는 부분은 선택 세그먼트 추출, append-only retry lineage, 승인된 세그먼트의 안전한 demotion, 그리고 mixed outcomes를 숨기지 않는 aggregate state다. [VERIFIED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md] [VERIFIED: src/services/ingestion-session.ts] [VERIFIED: src/services/ingestion-review.ts] [VERIFIED: src/services/ingestion-check.ts] [VERIFIED: src/storage/repositories/ingestion-session-repository.ts]

현재 구현은 `extractIngestionSession()`가 항상 전체 세그먼트를 다시 추출하고, `saveExtractionBatch()`가 대상 세그먼트의 후보를 `DELETE` 후 재삽입하며, `applySegmentPatch()`가 승인된 세그먼트의 `approvedAt`를 유지한 채 경계를 수정하고, `/check`는 세션 전체가 `approved`일 때만 통과시킨다. 이 조합은 “partial review는 이미 가능하지만 retry resilience는 아직 없다”는 상태를 보여 준다. [VERIFIED: src/services/ingestion-session.ts] [VERIFIED: src/storage/repositories/ingestion-session-repository.ts] [VERIFIED: src/services/ingestion-check.ts] [VERIFIED: tests/services/ingestion-review-workflow.test.ts] [VERIFIED: tests/api/check-controls-api.test.ts]

새 패키지는 필요 없다. Phase 10은 기존 TypeScript/Zod/Fastify/pg/pg-mem/Vitest 스택 위에서, `0006` migration, domain schema split or extension, repository aggregate logic, additive extract request schema, 그리고 lifecycle regression tests로 해결하는 것이 맞다. [VERIFIED: package.json] [VERIFIED: npm registry] [CITED: .planning/research/ARCHITECTURE.md]

**Primary recommendation:** 현재 `ingestion_segments`/`ingestion_candidates`를 “latest read model”로 유지하되, 새 append-only `ingestion_segment_attempts` ledger와 additive segment/session status metadata를 도입하고, `/extract`를 `segmentId[]` + explicit approval-reset semantics로 확장하라. 승인된 세그먼트는 retry 또는 material boundary edit 시 approval을 명시적으로 해제하고, `/check`의 full-session gate는 Phase 11 전까지 그대로 유지하라. [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md] [VERIFIED: src/api/routes/ingestion-extract.ts] [VERIFIED: src/storage/repositories/ingestion-session-repository.ts] [VERIFIED: src/services/ingestion-check.ts]

## Project Constraints (from AGENTS.md)

- StoryGraph의 판단은 항상 explainable해야 하며, 상태/이벤트/규칙/누락 가정으로 추적 가능해야 한다. [CITED: AGENTS.md]
- 기본 물리 법칙은 real-world physics이고, 사용자 규칙은 그 위에 override로 추가된다. [CITED: AGENTS.md]
- LLM은 extraction/interpretation을 도울 수 있지만 deterministic consistency judgment는 logic-led로 유지되어야 한다. [CITED: AGENTS.md]
- 자연어 입력은 structured internal representation으로 normalize되어야 한다. [CITED: AGENTS.md]
- 파일 변경 작업은 GSD workflow를 따라야 하며, 이 문서는 사용자가 요청한 GSD research artifact다. [CITED: AGENTS.md]
- 프로젝트 루트에 `CLAUDE.md`는 없다. [VERIFIED: `test -f /home/usow/Desktop/storygraph/CLAUDE.md`]
- `.claude/skills`와 `.agents/skills` 아래 project skill index는 발견되지 않았다. [VERIFIED: `find /home/usow/Desktop/storygraph/.claude/skills /home/usow/Desktop/storygraph/.agents/skills -maxdepth 2 -name SKILL.md`]

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | `5.9.3` 설치 / `6.0.2` 레지스트리 최신 `[VERIFIED: package.json][VERIFIED: npm ls][VERIFIED: npm registry]` | session/segment state, retry metadata, repository DTO, API contracts를 정적 타입으로 고정한다. | 현재 코드베이스가 strict TypeScript 기반이고 `npm run typecheck`가 통과하므로 Phase 10은 업그레이드가 아니라 기존 타입 계층 확장이 맞다. `[VERIFIED: package.json][VERIFIED: npm run typecheck]` |
| Zod | `4.3.6` 설치 / 최신 `[VERIFIED: package.json][VERIFIED: npm ls][VERIFIED: npm registry]` | extract request, session/segment snapshot, retry metadata, review guardrails를 런타임에서 검증한다. | 현재 domain/API가 Zod-first이고 Zod 4는 stable이며 native JSON Schema conversion도 제공하므로 Fastify route schema를 나중에 맞추기 쉽다. `[VERIFIED: src/domain/ingestion.ts][VERIFIED: src/api/schemas.ts][CITED: https://zod.dev/][CITED: https://zod.dev/json-schema]` |
| Fastify | `5.8.4` 설치 / 최신 `[VERIFIED: package.json][VERIFIED: npm ls][VERIFIED: npm registry]` | additive `/extract`, `/segments/:id`, `/approve`, `/check` route surface를 유지한다. | 최신 Fastify 문서는 route-level schema, hook, error handling, response serialization 경로를 명확히 제공하고, 현재 API가 이미 Fastify route thin-wrapper 패턴을 사용한다. `[VERIFIED: src/api/routes/ingestion-extract.ts][VERIFIED: src/api/routes/ingestion-review.ts][CITED: https://fastify.dev/docs/latest/Reference/Routes/][CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/]` |
| pg | `8.20.0` 설치 / 최신 `[VERIFIED: package.json][VERIFIED: npm ls][VERIFIED: npm registry]` | append-only attempt ledger와 current snapshot row를 SQL transaction으로 갱신한다. | 현재 저장소가 parameterized SQL과 transaction helper에 의존하므로 Phase 10도 동일 패턴을 써야 한다. `[VERIFIED: src/storage/repositories/ingestion-session-repository.ts][VERIFIED: src/storage/db.ts][CITED: https://www.postgresql.org/docs/current/sql-commit.html]` |
| pg-mem | `3.0.14` 설치 / 최신 `[VERIFIED: package.json][VERIFIED: npm ls][VERIFIED: npm registry]` | migration, repository, API regression을 외부 DB 없이 검증한다. | 현재 ingestion/storage/API 테스트가 모두 pg-mem으로 돌아가므로 retry/stale/failure matrix도 같은 방식으로 빠르게 커버할 수 있다. `[VERIFIED: tests/storage/ingestion-session-repository.test.ts][VERIFIED: tests/api/ingestion-review-api.test.ts]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | `3.2.4` 설치 / `4.1.4` 레지스트리 최신 `[VERIFIED: package.json][VERIFIED: npm ls][VERIFIED: npm registry]` | selected extraction, stale demotion, idempotent reapproval, `/check` guard regression을 빠르게 검증한다. | 현재 ingestion suite가 19 tests로 통과하므로 Phase 10도 targeted Vitest loop 위에서 계획하는 것이 맞다. `[VERIFIED: npm run test:ingestion]` |
| PostgreSQL `jsonb` | PostgreSQL 18 current docs `[CITED: https://www.postgresql.org/docs/current/datatype-json.html]` | per-attempt candidate snapshot, failure detail, provenance detail 같은 구조적이지만 가변적인 payload를 저장한다. | 문서는 대부분의 앱이 `jsonb`를 선호해야 한다고 말하지만, 큰 JSON 문서를 한 row에 계속 갱신하면 row-level lock contention이 커지므로 “segment row에 누적 history JSONB”가 아니라 “attempt당 한 row”에 쓰는 것이 맞다. `[CITED: https://www.postgresql.org/docs/current/datatype-json.html]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Append-only `ingestion_segment_attempts` | `ingestion_segments.retry_history jsonb` 단일 컬럼 | PostgreSQL docs는 큰 JSON update가 row-level lock을 잡는다고 경고하므로, growing history를 단일 row에 누적하는 설계는 불리하다. `[CITED: https://www.postgresql.org/docs/current/datatype-json.html]` |
| Existing `/extract` additive extension | 새 `/retry` 또는 background job surface | D-12가 기존 extract route 확장을 요구하므로 별도 workflow surface는 Phase 경계를 흐린다. `[CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md]` |
| Service-layer conflict checks | Fastify validation 단계에서 DB 조회 | Fastify docs는 initial validation에서 async DB access를 권하지 않으므로 state conflict는 service/preHandler에서 처리해야 한다. `[CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/]` |
| Keep current dependency set | Queue/workflow library 추가 | D-11이 request-driven flow와 no background worker를 잠근 상태라, 새 infra는 Phase 10의 범위를 벗어난다. `[CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md]` |

**Installation:** 새 패키지는 권장하지 않는다. 현재 설치 상태를 유지한 채 schema/migration/service/test만 확장하면 된다. [VERIFIED: package.json] [VERIFIED: npm ls]

```bash
npm install
```

**Version verification:**

| Package | Installed | Latest Registry | Registry Modified | Action |
|---------|-----------|-----------------|-------------------|--------|
| fastify | `5.8.4` `[VERIFIED: npm ls]` | `5.8.4` `[VERIFIED: npm registry]` | `2026-03-23T10:31:05.541Z` `[VERIFIED: npm registry]` | 유지. Phase 10은 route/schema 확장만 수행한다. `[VERIFIED: src/api/routes/ingestion-extract.ts]` |
| zod | `4.3.6` `[VERIFIED: npm ls]` | `4.3.6` `[VERIFIED: npm registry]` | `2026-01-25T21:51:57.252Z` `[VERIFIED: npm registry]` | 유지. session/segment metadata 확장에 충분하다. `[VERIFIED: src/domain/ingestion.ts]` |
| pg | `8.20.0` `[VERIFIED: npm ls]` | `8.20.0` `[VERIFIED: npm registry]` | `2026-03-04T23:48:49.532Z` `[VERIFIED: npm registry]` | 유지. transaction-based repository 패턴을 계속 사용한다. `[VERIFIED: src/storage/repositories/ingestion-session-repository.ts]` |
| pg-mem | `3.0.14` `[VERIFIED: npm ls]` | `3.0.14` `[VERIFIED: npm registry]` | `2026-02-26T11:33:37.382Z` `[VERIFIED: npm registry]` | 유지. repository/API 회귀 테스트에 필요하다. `[VERIFIED: tests/storage/ingestion-session-repository.test.ts]` |
| vitest | `3.2.4` `[VERIFIED: npm ls]` | `4.1.4` `[VERIFIED: npm registry]` | `2026-04-09T07:36:53.103Z` `[VERIFIED: npm registry]` | 업그레이드하지 말고 Phase 10 구현만 검증한다. 현재 suite가 통과한다. `[VERIFIED: npm run test:ingestion]` |
| typescript | `5.9.3` `[VERIFIED: npm ls]` | `6.0.2` `[VERIFIED: npm registry]` | `2026-04-01T07:46:54.262Z` `[VERIFIED: npm registry]` | 업그레이드하지 말고 current contracts를 확장한다. `[VERIFIED: npm run typecheck]` |

## Architecture Patterns

### Recommended Project Structure

```text
src/
├── domain/
│   ├── ingestion.ts                 # session/segment state split or additive retry metadata
│   └── index.ts                     # export updated ingestion contracts
├── services/
│   ├── ingestion-session.ts         # selected extract, approval-reset semantics, attempt creation
│   ├── ingestion-review.ts          # no-op reapproval, demotion-safe patch rules
│   └── ingestion-check.ts           # keep full-session gate unchanged
├── storage/
│   ├── migrations/0006_incremental_extraction_review_resilience.sql
│   └── repositories/ingestion-session-repository.ts
└── api/
    ├── routes/ingestion-extract.ts  # additive request contract
    └── schemas.ts                   # response serialization for retry/failure/stale metadata
tests/
├── services/
│   └── incremental-extraction-workflow.test.ts   # new focused lifecycle matrix
├── storage/ingestion-session-repository.test.ts  # extend aggregate + ledger round-trip
└── api/
    ├── ingestion-review-api.test.ts              # targeted extract + demotion behavior
    └── check-controls-api.test.ts                # partial-approval check block
```

이 구조는 기존 domain -> service -> repository -> API layering을 그대로 유지하면서, Phase 10의 cross-cutting 변경을 가장 작은 표면에 모은다. [CITED: .planning/research/ARCHITECTURE.md] [VERIFIED: src/services/ingestion-session.ts] [VERIFIED: src/services/ingestion-review.ts] [VERIFIED: src/storage/repositories/ingestion-session-repository.ts]

### Pattern 1: Append-Only Attempt Ledger + Current Snapshot

**What:** `ingestion_segments`와 `ingestion_candidates`는 “현재 UI/API가 읽는 latest snapshot”으로 유지하고, 새 `ingestion_segment_attempts` 테이블을 append-only로 추가해 retry lineage를 남겨라. 현재 `saveExtractionBatch()`는 세그먼트 후보를 삭제 후 재삽입하므로, 이 함수 하나만으로는 D-09의 retry history auditability를 만족시킬 수 없다. [VERIFIED: src/storage/repositories/ingestion-session-repository.ts] [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md]

**When to use:** extract 성공/실패 여부와 무관하게, 세그먼트마다 attempt row를 먼저 기록하고 그다음 current snapshot을 업데이트하거나 실패 상태를 반영할 때 사용한다. 이렇게 해야 OPER-01의 resumable progress와 failure reporting이 분리된다. [CITED: .planning/REQUIREMENTS.md] [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md]

**Why:** PostgreSQL docs는 `jsonb`가 유효하고 구조화된 문서를 저장하기 좋다고 설명하지만, 큰 JSON 문서를 갱신하면 row-level lock이 whole row에 걸린다고 경고한다. 따라서 “segment row 하나에 점점 커지는 retry history JSONB” 대신 “attempt당 한 row + optional candidate snapshot JSONB”가 맞다. [CITED: https://www.postgresql.org/docs/current/datatype-json.html]

**Example:**

```sql
-- Source: recommended additive migration pattern based on 0003_ingestion_review.sql and 0005_draft_scope.sql.
CREATE TABLE IF NOT EXISTS ingestion_segment_attempts (
  attempt_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES ingestion_sessions(session_id) ON DELETE CASCADE,
  segment_id TEXT NOT NULL REFERENCES ingestion_segments(segment_id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  request_kind TEXT NOT NULL,           -- full_session | targeted_retry
  status TEXT NOT NULL,                 -- success | failed
  invalidated_approval BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  error_summary TEXT,
  candidate_snapshot JSONB,
  UNIQUE (session_id, segment_id, attempt_number)
);

ALTER TABLE ingestion_segments
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_extraction_at TEXT,
  ADD COLUMN IF NOT EXISTS last_attempt_status TEXT,
  ADD COLUMN IF NOT EXISTS last_failure_summary TEXT,
  ADD COLUMN IF NOT EXISTS stale BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stale_reason TEXT,
  ADD COLUMN IF NOT EXISTS current_attempt_id TEXT;
```

### Pattern 2: Additive `/extract` Extension With Explicit Approval Reset

**What:** `POST /api/ingestion/submissions/:sessionId/extract`는 유지하되, request schema를 `{ segmentIds?: string[]; allowApprovalReset?: boolean }`로 확장하라. `segmentIds`가 없으면 whole-session default, 있으면 targeted extract다. [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md] [VERIFIED: src/api/routes/ingestion-extract.ts] [VERIFIED: src/api/schemas.ts]

**When to use:** 선택 재추출, 실패 세그먼트 재시도, stale 세그먼트 재추출, 승인된 세그먼트의 명시적 재열기(reopen)가 필요할 때 사용한다. [CITED: .planning/ROADMAP.md]

**Conflict rule recommendation:** 승인된 세그먼트가 target set에 포함되면 기본값은 `409 Conflict`로 막고, `allowApprovalReset: true`일 때만 approval clear + stale reset + retry를 허용하라. 이 방식은 D-05의 “silent overwrite 금지”와 D-12의 “existing extract route extension”을 동시에 만족한다. [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md] [VERIFIED: src/api/routes/ingestion-extract.ts]

**Fastify note:** Fastify docs는 initial validation에서 async DB access를 권하지 않으므로, `segmentIds`의 존재 여부, 중복 제거, cross-session 소속 확인, approved-state conflict 같은 검사는 Zod가 아니라 service/preHandler에서 수행해야 한다. [CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/] [CITED: https://fastify.dev/docs/latest/Reference/Routes/]

**Example:**

```typescript
// Source: extend current ExtractSubmissionRequestSchema and keep route thin.
export const ExtractSubmissionRequestSchema = z.object({
  segmentIds: z.array(z.string().min(1)).optional(),
  allowApprovalReset: z.boolean().optional().default(false)
});

const body = ExtractSubmissionRequestSchema.parse(request.body ?? {});
const snapshot = await extractIngestionSession(sessionId, {
  ...dependencies,
  targetSegmentIds: body.segmentIds,
  allowApprovalReset: body.allowApprovalReset
});
```

### Pattern 3: Split Session vs Segment State Or Add Equivalent Explicit Status Summary

**What:** 현재 `IngestionWorkflowStateSchema` 하나를 session과 segment가 함께 공유한다. 하지만 Phase 10은 session-level `partially_approved`와 segment-level `failed`/`stale`/`extracting` 같은 상태를 동시에 다뤄야 하므로, `IngestionSessionWorkflowState`와 `IngestionSegmentWorkflowState`를 분리하거나 최소한 동일한 명시력을 갖는 separate summary fields를 도입하라. [VERIFIED: src/domain/ingestion.ts] [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md]

**When to use:** aggregate workflow state를 재계산할 때, read response를 serialize할 때, `/check` guard를 판단할 때 사용한다. [VERIFIED: src/storage/repositories/ingestion-session-repository.ts] [VERIFIED: src/services/ingestion-check.ts]

**Recommended aggregate rule:** session state는 “모든 세그먼트 approved 여부”만 보는 것이 아니라 failed/stale/review-pending/approved counts를 함께 본 honest summary여야 한다. 다만 `/check`는 계속 `sessionState === "approved"`일 때만 허용해야 한다. [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md] [VERIFIED: tests/api/check-controls-api.test.ts]

**Example:**

```typescript
// Source: recommended replacement for current computeSessionWorkflowState().
function computeSessionWorkflowState(summary: {
  total: number;
  approved: number;
  needsReview: number;
  failed: number;
  extracting: number;
  stale: number;
}): IngestionSessionWorkflowState {
  if (summary.total > 0 && summary.approved === summary.total) return "approved";
  if (summary.extracting > 0) return "extracting";
  if (summary.failed > 0 && summary.approved > 0) return "partial_failure";
  if (summary.failed > 0) return "failed";
  if (summary.approved > 0) return "partially_approved";
  if (summary.stale > 0 || summary.needsReview > 0) return "needs_review";
  return "submitted";
}
```

### Pattern 4: Approval Demotion On Material Change, No-Op On Unchanged Reapproval

**What:** approved segment는 material boundary edit 또는 retry target이 되는 순간 `approvedAt`를 clear하고 `workflowState`를 `needs_review` 또는 equivalent stale-review state로 내려야 한다. 반대로 이미 approved이고 stale이 아니며 payload가 바뀌지 않은 세그먼트에 대한 재승인은 no-op이어야 한다. [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md] [VERIFIED: src/storage/repositories/ingestion-session-repository.ts] [VERIFIED: src/services/ingestion-review.ts]

**Why:** 현재 `applySegmentPatch()`는 approved segment의 `approvedAt`가 있으면 경계 수정 후에도 workflowState를 `"approved"`로 유지한다. 이것은 D-05와 정면 충돌한다. 반면 `approveReviewedSegment()`는 이미 approved인지 검사하지 않고 항상 promotion을 시도하므로, no-op short-circuit를 추가하는 편이 D-07에 더 가깝다. [VERIFIED: src/storage/repositories/ingestion-session-repository.ts] [VERIFIED: src/services/ingestion-review.ts]

**Idempotency nuance:** 현재 provenance ID는 `sessionId + segmentId + candidateId` 기반이라 같은 candidateId로 재승인하면 upsert가 되지만, 재추출 시 candidateId가 기본적으로 새 `generateId()`를 포함해 바뀔 수 있으므로 retry 이후 approval lineage는 append-only attempt/approval reset 모델로 다루는 편이 안전하다. [VERIFIED: src/services/ingestion-session.ts] [VERIFIED: src/storage/repositories/provenance-repository.ts]

**Example:**

```typescript
// Source: recommended guard around current approveReviewedSegment().
if (segment.segment.workflowState === "approved" && !segment.segment.stale) {
  return dependencies.ingestionSessionRepository.loadSessionSnapshot(sessionId);
}

if (materialBoundaryChanged || extractionRetried) {
  await repository.clearSegmentApproval(sessionId, segmentId, {
    stale: true,
    staleReason: materialBoundaryChanged ? "boundary_changed" : "reextracted",
    updatedAt
  });
}
```

### Anti-Patterns to Avoid

- **Whole-session re-extract by default for every retry:** 현재 코드의 전체 재추출 패턴을 그대로 두면 approved/untouched segment 보호가 깨진다. [VERIFIED: src/services/ingestion-session.ts] [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md]
- **Retry history stored only in current candidate rows:** `DELETE + INSERT` 저장 방식은 lineage를 지운다. [VERIFIED: src/storage/repositories/ingestion-session-repository.ts]
- **Approved boundary edits that keep `approvedAt`:** 현재 동작이며 반드시 제거해야 한다. [VERIFIED: src/storage/repositories/ingestion-session-repository.ts]
- **DB-dependent checks in initial validation:** Fastify docs 경고에 어긋난다. [CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/]
- **Relaxing `/check` to partial approval in Phase 10:** explicit approved-scope execution은 Phase 11 범위다. [CITED: .planning/ROADMAP.md] [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md]
- **Queue/worker introduction:** D-11이 잠근 범위를 벗어난다. [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Current-vs-history extraction persistence | ad hoc log lines or in-memory retry arrays | SQL append-only attempt ledger + current snapshot tables | current repository already owns snapshot loading and aggregate state; retry lineage만 별도 ledger로 추가하면 된다. `[VERIFIED: src/storage/repositories/ingestion-session-repository.ts]` |
| API conflict semantics | route마다 제각각 수동 문자열 검사 | Zod structural parse + service-level state conflict checks | current routes are thin wrappers, and Fastify docs discourage async validation for DB-backed semantics. `[VERIFIED: src/api/routes/ingestion-extract.ts][VERIFIED: src/api/routes/ingestion-review.ts][CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/]` |
| Canonical promotion path | 새 promotion subsystem | existing `StoryRepository`, `RuleRepository`, `ProvenanceRepository` | Phase 5/9가 이미 approval-gated promotion과 provenance 기록을 검증했다. `[VERIFIED: src/services/ingestion-review.ts][VERIFIED: src/storage/repositories/story-repository.ts][VERIFIED: src/storage/repositories/provenance-repository.ts]` |
| Full-session check gate | partial scope를 임시로 흉내 내는 Phase 10 shortcut | current `/check` gate 유지 | scoped checks는 Phase 11 범위다. `[VERIFIED: src/services/ingestion-check.ts][CITED: .planning/ROADMAP.md]` |
| Retry background orchestration | queue/worker/retry scheduler | request-driven retry endpoint | D-11과 out-of-scope 목록이 background infra를 배제한다. `[CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md]` |
| Package churn | Vitest/TypeScript major upgrade | current pinned install state | 현재 suite가 이미 녹색이므로 Phase 10 risk를 dependency churn으로 섞지 않는 것이 맞다. `[VERIFIED: npm run typecheck][VERIFIED: npm run test:ingestion]` |

**Key insight:** Phase 10의 본질은 “추출 결과를 더 똑똑하게 만드는 것”이 아니라 “추출 실패와 재시도가 canonical truth를 오염시키지 못하게 하는 상태 모델을 설계하는 것”이다. 그러므로 latest snapshot, attempt ledger, approval demotion, `/check` gate를 한 묶음으로 계획해야 한다. [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md] [VERIFIED: src/services/ingestion-session.ts] [VERIFIED: src/services/ingestion-review.ts] [VERIFIED: src/services/ingestion-check.ts]

## Common Pitfalls

### Pitfall 1: Retry Deletes The Only Evidence
**What goes wrong:** 재추출 후 이전 extracted/corrected candidate set이 통째로 사라져 “무엇이 실패했고 무엇이 바뀌었는지”를 설명할 수 없게 된다. [VERIFIED: src/storage/repositories/ingestion-session-repository.ts]
**Why it happens:** 현재 `saveExtractionBatch()`는 대상 segment의 후보를 먼저 `DELETE`하고 새 후보를 `INSERT`한다. [VERIFIED: src/storage/repositories/ingestion-session-repository.ts]
**How to avoid:** attempt ledger를 append-only로 추가하고, current candidate rows는 latest snapshot으로만 사용하라. [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md]
**Warning signs:** read payload에는 현재 후보만 있고, 실패한 이전 attempt의 error summary나 source span 변화가 어디에도 남지 않는다. [VERIFIED: src/api/schemas.ts]

### Pitfall 2: Approved Segment Stays Approved After Material Edit
**What goes wrong:** review가 끝난 세그먼트가 경계 수정이나 retry 후에도 approved로 남아 canonical truth와 review state가 어긋난다. [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md]
**Why it happens:** 현재 patch 로직은 `approvedAt`가 있으면 workflowState를 그대로 `"approved"`로 저장한다. [VERIFIED: src/storage/repositories/ingestion-session-repository.ts]
**How to avoid:** material edit/retry target hit 시 `approvedAt` clear + stale/review-required marker 설정을 한 transaction 안에서 수행하라. [CITED: https://www.postgresql.org/docs/current/sql-commit.html] [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md]
**Warning signs:** approved segment의 `sourceTextRef`나 `segmentText`가 바뀌었는데도 `/check` eligibility 계산에 그대로 포함된다. [VERIFIED: src/storage/repositories/ingestion-session-repository.ts] [VERIFIED: src/services/ingestion-check.ts]

### Pitfall 3: Session State Hides Mixed Outcomes
**What goes wrong:** 일부 세그먼트는 실패했고 일부는 approved인데 session state가 단순 `needs_review` 또는 `partially_approved`로만 보여서 운영 판단이 흐려진다. [CITED: .planning/REQUIREMENTS.md]
**Why it happens:** 현재 aggregate 계산은 approved / needs_review / extracted / submitted만 구분하고 failed/stale/extracting을 표현하지 않는다. [VERIFIED: src/storage/repositories/ingestion-session-repository.ts] [VERIFIED: src/domain/ingestion.ts]
**How to avoid:** segment summary와 session aggregate counts를 explicit하게 추가하고, 필요하면 session/segment enum을 분리하라. [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md]
**Warning signs:** API가 partial failure를 “just needs_review”처럼 보이게 하거나, 재시도 가능 세그먼트 수를 보여 주지 못한다. [VERIFIED: src/api/schemas.ts]

### Pitfall 4: Approved-Segment Retry Has No Explicit User Intent
**What goes wrong:** 작성자가 승인된 세그먼트를 실수로 target set에 넣었는데 approval이 묵시적으로 사라진다. [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md]
**Why it happens:** current extract route에는 request body semantics가 비어 있고, approved retry에 대한 explicit override contract도 없다. [VERIFIED: src/api/routes/ingestion-extract.ts] [VERIFIED: src/api/schemas.ts]
**How to avoid:** `allowApprovalReset` 같은 additive explicit flag를 도입하거나, 동등한 명시적 reopen semantics를 강제하라. [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md]
**Warning signs:** approved 세그먼트 retry 후 사용자가 왜 approval이 사라졌는지 API만 보고는 알 수 없다. [VERIFIED: src/api/schemas.ts]

### Pitfall 5: Semantic Checks Are Pushed Into Validator Phase
**What goes wrong:** validation 단계에서 DB나 repository를 건드리면서 latency, complexity, unhandled rejection 위험이 생긴다. [CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/]
**Why it happens:** `segmentIds` ownership, duplicate target, approved conflict, stale conflict 같은 검사를 schema validation과 혼동하기 쉽다. [VERIFIED: src/api/routes/ingestion-extract.ts]
**How to avoid:** Zod는 shape validation만 맡기고, semantic conflict는 service 또는 preHandler 단계에서 처리하라. [CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/] [CITED: https://fastify.dev/docs/latest/Reference/Routes/]
**Warning signs:** route validator가 repository dependency를 필요로 하거나, validation error와 workflow conflict가 뒤섞여 400/409 semantics가 흐려진다. [VERIFIED: src/api/routes/ingestion-review.ts]

### Pitfall 6: Retry History Stored As One Growing JSON Blob
**What goes wrong:** 세그먼트 하나를 retry할수록 같은 row update가 커지고 lock contention과 audit parsing 비용이 커진다. [CITED: https://www.postgresql.org/docs/current/datatype-json.html]
**Why it happens:** JSONB가 유연하다는 이유로 history 전체를 한 row에 누적하려는 설계 유혹이 크다. [CITED: https://www.postgresql.org/docs/current/datatype-json.html]
**How to avoid:** history는 append-only attempt rows로 쪼개고, JSONB는 attempt snapshot 같은 atomic datum에만 사용하라. [CITED: https://www.postgresql.org/docs/current/datatype-json.html]
**Warning signs:** `ingestion_segments` row 하나에 retry array가 계속 커지고, updated_at가 모든 history append마다 덮어써진다. [CITED: https://www.postgresql.org/docs/current/datatype-json.html]

## Code Examples

Verified patterns from current codebase and official sources:

### Selected Extract Request Schema

```typescript
// Source: src/api/routes/ingestion-extract.ts currently keeps the route thin,
// and Fastify docs recommend structural validation + service-level async semantics.
export const ExtractSubmissionRequestSchema = z.object({
  segmentIds: z.array(z.string().min(1)).optional(),
  allowApprovalReset: z.boolean().optional().default(false)
});

app.post("/api/ingestion/submissions/:sessionId/extract", async (request, reply) => {
  const params = request.params as { sessionId?: string };
  const body = ExtractSubmissionRequestSchema.parse(request.body ?? {});
  const snapshot = await extractIngestionSession(params.sessionId ?? "", {
    ...dependencies,
    targetSegmentIds: body.segmentIds,
    allowApprovalReset: body.allowApprovalReset
  });
  return reply.code(200).send(serializeIngestionSessionResponse(snapshot));
});
```

### Append-Only Attempt Write Before Current Snapshot Replacement

```typescript
// Source: recommended repository pattern layered on top of current saveExtractionBatch().
await withTransaction(this.client, async () => {
  await this.client.query(
    `
      INSERT INTO ingestion_segment_attempts (
        attempt_id, session_id, segment_id, attempt_number, request_kind,
        status, invalidated_approval, started_at, finished_at, error_summary, candidate_snapshot
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CAST($11 AS jsonb))
    `,
    [
      attemptId,
      sessionId,
      segmentId,
      attemptNumber,
      requestKind,
      status,
      invalidatedApproval,
      startedAt,
      finishedAt,
      errorSummary,
      JSON.stringify(candidateSnapshot)
    ]
  );

  if (status === "success") {
    await replaceCurrentCandidatesForSegment(sessionId, segmentId, attemptId, candidates);
  } else {
    await markSegmentFailure(sessionId, segmentId, {
      currentAttemptId: attemptId,
      lastFailureSummary: errorSummary
    });
  }
});
```

### No-Op Reapproval And Safe Demotion

```typescript
// Source: current approveReviewedSegment() always promotes, so add an explicit no-op guard.
if (segment.segment.workflowState === "approved" && !segment.segment.stale) {
  return repository.loadSessionSnapshot(sessionId);
}

if (retryingApprovedSegment || materialBoundaryChanged) {
  await repository.clearSegmentApproval(sessionId, segmentId, {
    stale: true,
    staleReason: retryingApprovedSegment ? "reextracted" : "boundary_changed",
    updatedAt
  });
}

await promoteApprovedSegment(snapshot.session, segment, dependencies);
await repository.approveSegment(sessionId, segmentId, { approvedAt, updatedAt: approvedAt });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Whole-session extract only | explicit `segmentId[]` targeted extract with whole-session default | v1.1 roadmap / Phase 10 target `[CITED: .planning/ROADMAP.md]` | larger drafts에서 failed/stale segment만 재시도할 수 있다. `[CITED: .planning/REQUIREMENTS.md]` |
| Current rows overwrite the only extraction record | current snapshot + append-only attempt ledger | Phase 10 recommendation `[VERIFIED: src/storage/repositories/ingestion-session-repository.ts][CITED: https://www.postgresql.org/docs/current/datatype-json.html]` | retry lineage와 failure state를 audit 가능하게 만든다. `[CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md]` |
| Approved segment can remain approved after patch | retry/material edit clears approval and requires explicit reapproval | Phase 10 locked behavior `[CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md]` | canonical drift를 막고 provenance를 다시 묶는다. `[VERIFIED: src/services/ingestion-review.ts]` |
| Full-session `/check` gate only | full-session gate 유지, approved-scope execution은 Phase 11 | current code + Phase 10 boundary `[VERIFIED: src/services/ingestion-check.ts][CITED: .planning/ROADMAP.md]` | Phase 10에서 unsafe partial check shortcut을 만들지 않는다. `[CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md]` |
| Shared workflow enum for session and segment | separate or equivalently explicit session/segment state modeling | Phase 10 recommendation `[VERIFIED: src/domain/ingestion.ts]` | mixed outcomes를 정직하게 표현하고 aggregate logic를 단순화한다. `[CITED: .planning/REQUIREMENTS.md]` |

**Deprecated/outdated:**

- current empty extract request body는 Phase 10 요구사항을 충족하지 못한다. [VERIFIED: src/api/schemas.ts] [VERIFIED: src/api/routes/ingestion-extract.ts]
- current `DELETE FROM ingestion_candidates` overwrite model만으로는 retry auditability가 부족하다. [VERIFIED: src/storage/repositories/ingestion-session-repository.ts]
- Phase 10에서 partial approval에 대한 actual scoped check execution을 넣는 것은 범위 초과다. [CITED: .planning/ROADMAP.md]

## Assumptions Log

없음. 본 문서의 사실 주장은 모두 현재 코드, 현재 설정, npm registry, 또는 공식 문서에 의해 검증되었고, 권고안은 그 근거들에서 도출한 설계 판단이다. [VERIFIED: src/services/ingestion-session.ts] [VERIFIED: package.json] [VERIFIED: npm registry] [CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/] [CITED: https://www.postgresql.org/docs/current/datatype-json.html]

## Open Questions (RESOLVED)

1. **승인된 세그먼트 재추출의 기본 HTTP semantics를 어떻게 고정할 것인가?**
   - What we know: context는 exact HTTP conflict semantics를 discretion으로 남겼지만 silent overwrite는 금지했다. [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md]
   - Decision: Phase 10 planner baseline은 `409 unless allowApprovalReset=true`로 잠근다. 승인된 세그먼트를 재추출하려면 호출자가 approval reset intent를 명시해야 하며, 그렇지 않으면 API는 conflict로 거절한다. [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md]
   - Why this is locked: explicit override가 silent approval loss를 막고, approval demotion을 intentional action으로 제한하므로 DRAFT-01과 REVIEW-02를 동시에 만족한다. [CITED: .planning/REQUIREMENTS.md] [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md]

2. **Session/segment state를 완전히 분리할 것인가, 아니면 additive status summary로 충분한가?**
   - What we know: 현재 shared enum은 `partially_approved`를 session과 segment에 동시에 허용하고, failed/stale/extracting을 표현하지 못한다. [VERIFIED: src/domain/ingestion.ts]
   - Decision: Phase 10 plan은 session/segment state를 분리하는 방향을 우선안으로 고정하되, implementation blast radius가 과하면 equivalent explicit summary fields를 함께 도입해 mixed-state visibility를 반드시 유지한다. 즉, enum purity보다도 "honest mixed-state visibility"를 deliverable로 잠근다. [CITED: .planning/REQUIREMENTS.md] [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md]
   - Why this is locked: plan 10-01/10-02는 per-segment retry/error/stale metadata와 session-level progress summary를 함께 노출하도록 설계되어 있으므로, 이 결정은 현재 plan set과 일치하고 REVIEW-01/OPER-01의 observability 요구를 충족한다. [CITED: .planning/REQUIREMENTS.md]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | TypeScript compile, Vitest, Fastify app execution | ✓ `[VERIFIED: node --version]` | `v25.8.2` `[VERIFIED: node --version]` | project stack docs는 Node `24.14.0 LTS`를 추천하지만 현재 local runtime에서도 tests/typecheck가 통과했다. Phase 10에서 runtime upgrade는 하지 말고 현재 install state를 유지하라. `[CITED: AGENTS.md][VERIFIED: npm run typecheck][VERIFIED: npm run test:ingestion]` |
| npm | package scripts, registry verification | ✓ `[VERIFIED: npm --version]` | `11.12.1` `[VERIFIED: npm --version]` | — |
| Vitest CLI | Nyquist validation loop | ✓ `[VERIFIED: npx vitest --version]` | `3.2.4` `[VERIFIED: npx vitest --version]` | `npm run test:ingestion` wrapper 사용 가능. `[VERIFIED: package.json]` |
| Playwright CLI | broader repo browser verification only | ✓ `[VERIFIED: npx playwright --version]` | `1.59.1` `[VERIFIED: npx playwright --version]` | Phase 10 자체는 browser UI를 요구하지 않는다. `[CITED: .planning/ROADMAP.md]` |
| PostgreSQL CLI/server | external DB smoke only | ✗ `[VERIFIED: command -v psql]` | — | local verification은 pg-mem으로 충분하다. `[VERIFIED: tests/storage/ingestion-session-repository.test.ts]` |

**Missing dependencies with no fallback:**

- 없음. Phase 10 planning과 local verification에 필요한 도구는 모두 있다. `[VERIFIED: npm run typecheck][VERIFIED: npm run test:ingestion]`

**Missing dependencies with fallback:**

- `psql`은 없지만, current storage/API tests는 pg-mem 기반이라 local Phase 10 구현/검증은 막히지 않는다. `[VERIFIED: command -v psql][VERIFIED: tests/storage/ingestion-session-repository.test.ts]`

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `3.2.4` installed. `[VERIFIED: npx vitest --version]` |
| Config file | `vitest.config.ts`, `environment: "node"`, `include: ["tests/**/*.test.ts"]`. `[VERIFIED: vitest.config.ts]` |
| Quick run command | `npm exec -- vitest run tests/storage/ingestion-session-repository.test.ts tests/services/incremental-extraction-workflow.test.ts tests/api/ingestion-review-api.test.ts tests/api/check-controls-api.test.ts --bail=1` `[VERIFIED: package.json][CITED: .planning/ROADMAP.md]` |
| Full suite command | `npm run typecheck && npm run test:ingestion` `[VERIFIED: package.json][VERIFIED: npm run typecheck][VERIFIED: npm run test:ingestion]` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DRAFT-01 | stable draft/segment IDs remain valid while targeted extraction addresses only selected segments | service + API regression | `npm exec -- vitest run tests/services/natural-language-extraction.test.ts tests/api/ingestion-review-api.test.ts --bail=1` `[VERIFIED: package.json]` | ✅ existing files extendable. `[VERIFIED: tests/services/natural-language-extraction.test.ts][VERIFIED: tests/api/ingestion-review-api.test.ts]` |
| DRAFT-04 | selected extract, retry, per-segment success/failure reporting | service + storage + API | `npm exec -- vitest run tests/services/incremental-extraction-workflow.test.ts tests/storage/ingestion-session-repository.test.ts tests/api/ingestion-review-api.test.ts --bail=1` `[VERIFIED: package.json][CITED: .planning/ROADMAP.md]` | ❌ add new focused service file; extend storage/API files. `[VERIFIED: rg --files tests]` |
| REVIEW-01 | safe partial approval, untouched approved segments preserved, changed approved segments demoted | service + API | `npm exec -- vitest run tests/services/ingestion-review-workflow.test.ts tests/api/ingestion-review-api.test.ts tests/api/check-controls-api.test.ts --bail=1` `[VERIFIED: package.json]` | ✅ existing files extendable. `[VERIFIED: tests/services/ingestion-review-workflow.test.ts][VERIFIED: tests/api/check-controls-api.test.ts]` |
| REVIEW-02 | per-segment extracted/corrected payload and retry lineage remain inspectable before promotion | storage + API | `npm exec -- vitest run tests/storage/ingestion-session-repository.test.ts tests/api/ingestion-review-api.test.ts --bail=1` `[VERIFIED: package.json]` | ✅ extend existing files for attempt history serialization. `[VERIFIED: tests/storage/ingestion-session-repository.test.ts]` |
| OPER-01 | partial failure/resumable progress is visible and does not masquerade as completion | service + API | `npm exec -- vitest run tests/services/incremental-extraction-workflow.test.ts tests/api/check-controls-api.test.ts --bail=1` `[VERIFIED: package.json][CITED: .planning/REQUIREMENTS.md]` | ❌ new service file needed; API file exists. `[VERIFIED: tests/api/check-controls-api.test.ts]` |

### Sampling Rate

- **Per task commit:** touched-file targeted Vitest command + `npm run typecheck`. [VERIFIED: package.json]
- **Per wave merge:** `npm run test:ingestion`. [VERIFIED: package.json] [VERIFIED: npm run test:ingestion]
- **Phase gate:** `npm run typecheck && npm run test:ingestion`; Phase 10은 `/check` semantics를 건드리므로 `tests/api/check-controls-api.test.ts`는 항상 포함되어야 한다. [VERIFIED: tests/api/check-controls-api.test.ts]

### Wave 0 Gaps

- [ ] `tests/services/incremental-extraction-workflow.test.ts` — selected extract, success/failure mix, stale demotion, retry on approved segment with explicit reset semantics for `DRAFT-04`, `REVIEW-01`, `OPER-01`. [CITED: .planning/ROADMAP.md] [VERIFIED: rg --files tests]
- [ ] Extend `tests/storage/ingestion-session-repository.test.ts` — attempt ledger persistence, summary columns, aggregate session state recomputation for `DRAFT-04`, `OPER-01`. [VERIFIED: tests/storage/ingestion-session-repository.test.ts]
- [ ] Extend `tests/api/ingestion-review-api.test.ts` — `segmentId[]` extract contract, untouched approved segment preservation, per-segment retry metadata serialization for `DRAFT-04`, `REVIEW-02`. [VERIFIED: tests/api/ingestion-review-api.test.ts]
- [ ] Extend `tests/api/check-controls-api.test.ts` — partial approval still 409 on full-session `/check`, retry after approval reset remains explicit for `REVIEW-01`, `OPER-01`. [VERIFIED: tests/api/check-controls-api.test.ts]
- [ ] Extend `tests/services/ingestion-review-workflow.test.ts` — unchanged approved reapproval no-op, changed approved segment demotion, provenance stability for `REVIEW-01`, `REVIEW-02`. [VERIFIED: tests/services/ingestion-review-workflow.test.ts]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no `[CITED: .planning/REQUIREMENTS.md]` | Phase 10은 authentication surface를 추가하지 않는다. |
| V3 Session Management | no `[VERIFIED: src/domain/ingestion.ts]` | ingestion session IDs are workflow identifiers, not user sessions. |
| V4 Access Control | yes `[CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md]` | user auth가 아니라 workflow transition control로 해석해야 하며, retry/approve/check는 explicit state guard를 통해 막아야 한다. `[VERIFIED: src/services/ingestion-review.ts][VERIFIED: src/services/ingestion-check.ts]` |
| V5 Input Validation | yes `[VERIFIED: src/api/schemas.ts][VERIFIED: src/domain/ingestion.ts]` | Zod structural validation + service-level semantic checks를 결합한다. `[CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/]` |
| V6 Cryptography | no `[VERIFIED: src/services/ingestion-session.ts]` | Phase 10에 새 crypto primitive는 필요 없다. |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 승인된 세그먼트의 무의식적 overwrite | Tampering | `allowApprovalReset` 같은 explicit intent gate + approval clear in transaction. `[CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md][CITED: https://www.postgresql.org/docs/current/sql-commit.html]` |
| Retry lineage 상실로 인한 “무엇이 바뀌었는지” 부인 가능 | Repudiation | append-only attempt ledger + current candidate snapshot 분리. `[VERIFIED: src/storage/repositories/ingestion-session-repository.ts]` |
| 다른 세션의 `segmentId`를 target set에 섞어 보내는 요청 | Tampering | service layer에서 session ownership, dedupe, existence를 검사하고 409/404를 반환한다. `[VERIFIED: src/api/routes/ingestion-extract.ts][CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/]` |
| partial approval 상태에서 full-session `/check` 실행 | Tampering | current full-session approval gate 유지. `[VERIFIED: src/services/ingestion-check.ts][VERIFIED: tests/api/check-controls-api.test.ts]` |
| validation 단계의 async DB lookup으로 인한 DoS/unstable failures | Denial of Service | Fastify 권장대로 async semantic checks는 `preHandler` 또는 service에 둔다. `[CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/]` |

## Sources

### Primary (HIGH confidence)
- `.planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md` - locked decisions, discretion, deferred scope. [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md]
- `.planning/REQUIREMENTS.md` - Phase 10 requirement mapping. [CITED: .planning/REQUIREMENTS.md]
- `.planning/ROADMAP.md` - phase boundary, success criteria, plan split. [CITED: .planning/ROADMAP.md]
- `.planning/research/ARCHITECTURE.md` - v1.1 layering and ingestion extension direction. [CITED: .planning/research/ARCHITECTURE.md]
- `.planning/milestones/v1.0-phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md` - original submit/extract/review/approve/check and segment approval contract. [CITED: .planning/milestones/v1.0-phases/05-natural-language-ingestion-and-review-api/05-CONTEXT.md]
- `.planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md` - Phase 9 draft identity/source ref foundation. [CITED: .planning/phases/09-draft-container-and-segment-scope-model/09-CONTEXT.md]
- `src/services/ingestion-session.ts` - current whole-session extraction loop and candidate ID generation. [VERIFIED: src/services/ingestion-session.ts]
- `src/storage/repositories/ingestion-session-repository.ts` - current candidate overwrite, aggregate workflow state, patch/approve behavior. [VERIFIED: src/storage/repositories/ingestion-session-repository.ts]
- `src/services/ingestion-review.ts` - current promotion/provenance semantics and approval flow. [VERIFIED: src/services/ingestion-review.ts]
- `src/services/ingestion-check.ts` - current full-session approval gate. [VERIFIED: src/services/ingestion-check.ts]
- `src/api/schemas.ts`, `src/api/routes/ingestion-extract.ts`, `src/api/routes/ingestion-review.ts` - current public request/response surface. [VERIFIED: src/api/schemas.ts] [VERIFIED: src/api/routes/ingestion-extract.ts] [VERIFIED: src/api/routes/ingestion-review.ts]
- `tests/storage/ingestion-session-repository.test.ts`, `tests/services/ingestion-review-workflow.test.ts`, `tests/api/ingestion-review-api.test.ts`, `tests/api/check-controls-api.test.ts` - current validated behavior and regression anchors. [VERIFIED: tests/storage/ingestion-session-repository.test.ts] [VERIFIED: tests/services/ingestion-review-workflow.test.ts] [VERIFIED: tests/api/ingestion-review-api.test.ts] [VERIFIED: tests/api/check-controls-api.test.ts]
- `package.json`, `vitest.config.ts`, `npm ls`, `npm view`, `npm run typecheck`, `npm run test:ingestion` - installed stack and validation baseline. [VERIFIED: package.json] [VERIFIED: vitest.config.ts] [VERIFIED: npm registry] [VERIFIED: npm run typecheck] [VERIFIED: npm run test:ingestion]
- Fastify docs - route/hook/schema guidance and async validation warning. [CITED: https://fastify.dev/docs/latest/Reference/Routes/] [CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/]
- PostgreSQL docs - `COMMIT` transaction guarantee and `jsonb` guidance/row-lock caveat. [CITED: https://www.postgresql.org/docs/current/sql-commit.html] [CITED: https://www.postgresql.org/docs/current/datatype-json.html]
- Zod docs - Zod 4 stability and JSON Schema conversion. [CITED: https://zod.dev/] [CITED: https://zod.dev/json-schema]

### Secondary (MEDIUM confidence)
- 없음. 핵심 판단은 모두 코드베이스, 공식 문서, 또는 npm registry에서 직접 검증했다. [VERIFIED: src/services/ingestion-session.ts] [VERIFIED: package.json] [VERIFIED: npm registry]

### Tertiary (LOW confidence)
- 없음. [VERIFIED: src/services/ingestion-session.ts] [VERIFIED: package.json] [VERIFIED: npm registry]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 설치 버전, 최신 레지스트리, 현재 녹색 검증 루프가 모두 확인되었다. [VERIFIED: npm ls] [VERIFIED: npm registry] [VERIFIED: npm run typecheck] [VERIFIED: npm run test:ingestion]
- Architecture: HIGH - locked phase decisions와 current code shape가 강하게 제약하므로 설계 자유도가 크지 않다. [CITED: .planning/phases/10-incremental-extraction-and-review-resilience/10-CONTEXT.md] [VERIFIED: src/services/ingestion-session.ts] [VERIFIED: src/storage/repositories/ingestion-session-repository.ts]
- Pitfalls: HIGH - 주요 위험이 모두 현재 구현에 직접 드러나거나 공식 문서 경고와 정합하다. [VERIFIED: src/storage/repositories/ingestion-session-repository.ts] [CITED: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/] [CITED: https://www.postgresql.org/docs/current/datatype-json.html]

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 for codebase shape and dependency versions, or until Phase 10 implementation materially changes ingestion state contracts. [VERIFIED: current repo state]
