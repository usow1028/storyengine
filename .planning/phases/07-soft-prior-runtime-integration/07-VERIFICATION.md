---
phase: 07-soft-prior-runtime-integration
verified: 2026-04-10T05:21:09Z
status: passed
score: 15/15 must-haves verified
overrides_applied: 0
---

# Phase 7: Soft-Prior Runtime Integration 검증 보고서

**Phase Goal:** Surface phase 04 advisory priors in checked outputs while preserving deterministic hard verdict truth  
**검증 시각:** 2026-04-10T05:21:09Z  
**상태:** passed  
**재검증 여부:** 아니오 — 최초 검증

## 목표 달성 판정

### Observable Truths

| # | 검증 대상 | 상태 | 실제 근거 |
|---|----------|------|-----------|
| 1 | 온디맨드 check가 deterministic hard verdict와 함께 soft-prior assessment를 계산해 반환한다 | VERIFIED | `executeVerdictRun`이 별도 `softPrior`를 반환하며, verdict runner 테스트와 API E2E가 `softPrior.status === "available"`을 검증한다. |
| 2 | soft-prior evidence는 hard rule이 아니라 advisory이며, dominant layer, representative pattern summary, repair plausibility adjustment를 설명 가능하게 제공한다 | VERIFIED | API schema는 `assessment`, `rerankedRepairs`, `repairPlausibilityAdjustments`를 별도 advisory 블록으로 노출하고, E2E는 drift score/threshold/triggered drift/dominant layer/pattern summary/contribution/repair adjustment를 확인한다. |
| 3 | ingestion review/check E2E가 soft-prior 결과 노출과 hard verdict classification 불변성을 증명한다 | VERIFIED | `tests/api/check-controls-api.test.ts`가 submit -> extract -> review -> approve -> check 흐름을 실행하고 enabled/disabled persisted verdict/run projection을 비교한다. |
| 4 | verdict run은 deterministic hard verdict 생성 및 저장 이후 soft-prior advisory를 계산한다 | VERIFIED | `src/services/verdict-runner.ts`에서 `verdictRepository.saveMany(verdicts)` 이후 `generateRepairCandidates`와 `evaluateConfiguredSoftPrior`가 호출된다. |
| 5 | soft-prior runtime config는 server-side trusted input이며, deterministic test를 위한 fixture `snapshotSet` 주입이 가능하다 | VERIFIED | `softPriorConfig`는 service/API dependency 객체에만 있고, 테스트는 server-side fixture `snapshotSet`을 주입한다. request payload에서는 받지 않는다. |
| 6 | disabled/missing/malformed/context-insufficient prior는 hard verdict run을 실패시키지 않고 명시적 unavailable status를 반환한다 | VERIFIED | runtime은 `disabled`, `missing_snapshot`, `invalid_snapshot`, `insufficient_context`를 반환한다. service 테스트는 disabled/missing에서도 `workflowState: "checked"`와 run persist를 확인했고, 별도 smoke로 `insufficient_context`를 확인했다. |
| 7 | soft prior가 enabled여도 hard verdict kind, finding ID, evidence, verdict-run metadata는 바뀌지 않는다 | VERIFIED | `tests/engine/verdict-runner.test.ts`가 enabled/disabled run의 persisted hard verdict projection과 run metadata를 비교한다. |
| 8 | manual ingestion check는 verdict-run의 soft-prior advisory result를 service result로 전파한다 | VERIFIED | `executeIngestionCheck`가 `softPriorConfig`를 `executeVerdictRun`에 넘기고 `softPrior: verdictRun.softPrior`를 반환한다. |
| 9 | API response contract는 기존 top-level check field를 유지하면서 별도 `softPrior` block을 노출한다 | VERIFIED | `CheckIngestionResponseSchema`는 `sessionId`, `workflowState`, `storyId`, `revisionId`, `runId`, `previousRunId`를 유지하고 `softPrior`를 별도 필드로 추가한다. |
| 10 | API/server dependency boundary는 priors를 server-side에서만 configure하며 request-supplied snapshot path를 받지 않는다 | VERIFIED | `StoryGraphApiDependencies`에만 `softPriorConfig`가 있고, request schemas는 prior config field를 정의하지 않는다. 테스트도 unknown prior field가 strip되는지 확인한다. |
| 11 | unavailable prior snapshot이어도 approved ingestion session은 `workflowState: "checked"`에 도달한다 | VERIFIED | `tests/services/ingestion-check-soft-prior.test.ts`가 disabled와 missing snapshot에서 checked workflow, persisted run, `lastVerdictRunId`를 확인한다. |
| 12 | live API flow `submit -> extract -> review -> approve -> check`는 server-configured fixture prior가 있을 때 `softPrior.status === "available"`을 반환한다 | VERIFIED | API E2E가 Fastify `app.inject()`로 전체 flow를 실행하고 enabled response의 `softPrior.status`가 `available`임을 검증한다. |
| 13 | 반환 advisory block은 drift scores, thresholds, triggered drifts, dominant prior layer, representative pattern summary, contribution evidence, reranked repairs, repair plausibility adjustments를 포함한다 | VERIFIED | API E2E가 해당 필드의 존재와 non-empty 결과를 직접 assert한다. |
| 14 | 같은 checked story path에서 soft prior enabled/disabled 여부와 무관하게 hard verdict classification, finding ID, evidence field, run metadata가 안정적이다 | VERIFIED | API 및 service-level 테스트가 enabled/disabled persisted hard verdict projection과 run metadata를 비교한다. |
| 15 | Phase 7 검증은 정적 wiring grep만이 아니라 실행된 service/API regression에 기반한다 | VERIFIED | targeted Vitest, broader prior/ingestion scripts, typecheck, insufficient-context smoke가 모두 실행되어 통과했다. |

**점수:** 15/15 truths verified

### Deferred Items

없음. Phase 8은 interactive inspection UI를 다루며, Phase 7 runtime/API goal의 미충족 항목을 대신하지 않는다.

### Required Artifacts

| Artifact | 기대 역할 | 상태 | 세부 근거 |
|----------|-----------|------|-----------|
| `src/services/soft-prior-runtime.ts` | status-wrapped soft-prior runtime config, transition builder, advisory wrapper | VERIFIED | runtime status/config/result type과 `buildSoftPriorTransitionInputs`, `evaluateConfiguredSoftPrior`를 export한다. unavailable status를 명시적으로 반환하고 raw `snapshotSet`은 advisory return에서 버린다. |
| `src/services/verdict-runner.ts` | `executeVerdictRun`의 optional advisory soft-prior hook | VERIFIED | `softPriorConfig`를 받고 hard verdict 저장 후 repair candidate를 만들며 별도 `softPrior`를 반환한다. |
| `src/services/index.ts` | service export surface | VERIFIED | `./soft-prior-runtime.js`를 export한다. |
| `src/services/ingestion-check.ts` | manual check에서 `softPrior` 전파 | VERIFIED | top-level check field와 session state update를 유지하면서 `softPrior`를 service result에 포함한다. |
| `src/api/app.ts` | trusted server-side soft-prior dependency boundary | VERIFIED | `StoryGraphApiDependencies`가 optional `softPriorConfig`를 포함하고 route registration은 dependency 객체를 내부로만 전달한다. |
| `src/api/schemas.ts` | separate advisory block용 Zod response schema | VERIFIED | `SoftPriorAdvisoryResponseSchema`를 정의하고 `CheckIngestionResponseSchema`에 `softPrior`를 추가한다. request schema에는 prior config field가 없다. |
| `tests/services/soft-prior-runtime.test.ts` | transition-token parity 및 unavailable status coverage | VERIFIED | transition token, rule/precondition token, disabled/missing/invalid status를 검증한다. |
| `tests/engine/verdict-runner.test.ts` | available advisory runtime 및 hard-verdict invariance coverage | VERIFIED | disabled default, available fixture prior, enabled/disabled hard persistence invariance를 검증한다. |
| `tests/services/ingestion-check-soft-prior.test.ts` | service-level unavailable propagation coverage | VERIFIED | disabled/missing snapshot에서도 checked workflow와 run metadata persist를 검증한다. |
| `tests/fixtures/soft-prior-ingestion-fixtures.ts` | soft-prior transition fixture와 맞는 API extraction candidates | VERIFIED | mage/spell/instant-arrival event 후보와 state/rule token을 제공한다. |
| `tests/api/check-controls-api.test.ts` | cross-phase E2E regression | VERIFIED | fixture construction, full API check flow, available advisory output, request config stripping, persisted hard data invariance를 검증한다. |

### Key Link Verification

| From | To | Via | 상태 | 근거 |
|------|----|-----|------|------|
| `src/services/verdict-runner.ts` | `src/services/soft-prior-runtime.ts` | `verdictRepository.saveMany(verdicts)` 이후 `evaluateConfiguredSoftPrior` 호출 | WIRED | gsd-tools key-link 통과, line inspection에서도 call order 확인. |
| `src/services/soft-prior-runtime.ts` | `src/services/soft-prior-evaluator.ts` | `evaluateSoftPriors` 재사용 | WIRED | runtime wrapper가 scoring/reranking을 재구현하지 않고 evaluator에 위임한다. |
| `src/services/soft-prior-runtime.ts` | `src/corpus/normalization.ts` | `field:operation:value` token convention | WIRED | token builder가 `field:operation:String(value ?? "unknown")`를 사용하고 unit test가 parity를 검증한다. |
| `src/services/ingestion-check.ts` | `src/services/verdict-runner.ts` | `softPriorConfig` 전달 | WIRED | manual check service가 trusted dependency config를 verdict runner에 넘긴다. |
| `src/api/schemas.ts` | `src/api/routes/ingestion-check.ts` | `CheckIngestionResponseSchema.parse(result)` | WIRED | route가 `softPrior`를 포함한 schema로 service result를 parse/send한다. |
| `src/api/app.ts` | `src/services/ingestion-check.ts` | server dependency object | WIRED | `StoryGraphApiDependencies`가 `softPriorConfig`를 포함하고 route가 dependency를 service에 전달한다. |
| `tests/api/check-controls-api.test.ts` | `src/api/routes/ingestion-check.ts` | Fastify `app.inject()` POST check route | WIRED | E2E가 `/api/ingestion/submissions/:sessionId/check`를 호출한다. |
| `tests/api/check-controls-api.test.ts` | `tests/fixtures/soft-prior-fixtures.ts` | `buildSoftPriorArtifactsFixture` 기반 injected `snapshotSet` | WIRED | E2E가 server-side snapshot set을 생성해 API dependency로 넘긴다. |
| `tests/api/check-controls-api.test.ts` | `src/storage/repositories/verdict-repository.ts` | persisted hard verdict comparison | WIRED | E2E가 run별 persisted verdict를 읽어 enabled/disabled projection을 비교한다. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Real Data 여부 | 상태 |
|----------|---------------|--------|----------------|------|
| `src/services/verdict-runner.ts` | `softPrior` | `storyRepository.loadGraph`, `evaluateRevision`, saved verdict evidence, `generateRepairCandidates`, `evaluateConfiguredSoftPrior` | Yes | FLOWING |
| `src/services/soft-prior-runtime.ts` | `assessment`, `rerankedRepairs`, `repairPlausibilityAdjustments` | configured `snapshotSet` 또는 loaded `snapshotDir`와 canonical event transition을 사용한 `evaluateSoftPriors` | Yes | FLOWING |
| `src/services/ingestion-check.ts` | service result `softPrior` | approved session check 이후 `executeVerdictRun` result | Yes | FLOWING |
| `src/api/routes/ingestion-check.ts` | HTTP response body | `executeIngestionCheck` result + `CheckIngestionResponseSchema` | Yes | FLOWING |
| `src/api/schemas.ts` | `SoftPriorAdvisoryResponseSchema` | domain soft-prior assessment/repair schemas; response에 snapshot artifact schema 없음 | Yes | FLOWING |
| `tests/api/check-controls-api.test.ts` | available E2E response | Fastify submit/extract/patch/approve/check flow + server-side fixture priors | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | 상태 |
|----------|---------|--------|------|
| TypeScript contract compile | `npm run typecheck` | `tsc --noEmit` exited 0 | PASS |
| Phase 7 targeted runtime/service/API regression | `npm run test -- tests/services/soft-prior-runtime.test.ts tests/services/ingestion-check-soft-prior.test.ts tests/engine/verdict-runner.test.ts tests/api/check-controls-api.test.ts` | 4 files passed, 14 tests passed | PASS |
| Prior layer regression | `npm run test:priors` | 4 files passed, 9 tests passed | PASS |
| Ingestion/API script gate | `npm run test:ingestion` | 5 files passed, 10 tests passed | PASS |
| Context-insufficient advisory status | `node --import tsx -e "...evaluateConfiguredSoftPrior(...)..."` | `insufficient_context` 출력, exit 0 | PASS |
| PLAN artifacts | `gsd-tools verify artifacts` for 07-01, 07-02, 07-03 | 10/10 artifacts passed | PASS |
| PLAN key links | `gsd-tools verify key-links` for 07-01, 07-02, 07-03 | 9/9 key links verified | PASS |

### Requirements Coverage

| Requirement | Source Plan | 설명 | 상태 | 근거 |
|-------------|-------------|------|------|------|
| SOFT-01 | 07-01, 07-02, 07-03 | Engine can use corpus-derived narrative patterns as soft priors without promoting them to hard rules | SATISFIED | soft prior는 별도 advisory `softPrior`로만 반환된다. storage repository/domain verdict/run record에는 `softPrior` persistence field가 없고, enabled/disabled 테스트가 hard verdict classification과 run metadata 불변성을 증명한다. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/services/verdict-runner.ts` | 73 | `return []` | Info | `findingId`/`reasonCode`가 없는 verdict를 repair source에서 제외하기 위한 필터링이다. user-visible empty implementation이 아니다. |
| `src/services/soft-prior-runtime.ts` | 126 | `const transitions = []` | Info | sorted adjacent events에서 채워지는 accumulator다. hardcoded output이 아니다. |

Phase 7 production path에서 blocker/warning급 stub, placeholder, hardcoded empty output은 발견되지 않았다.

### Human Verification Required

없음. Phase 7은 service/API/runtime behavior이며 visual, real-time, external-service 검증 대상이 없다. 핵심 behavior는 자동 테스트와 spot-check로 확인됐다.

### Gaps Summary

goal-blocking gap 없음. Phase 7은 checked runtime/API response에 advisory soft-prior output을 노출하고, advisory data를 hard verdict persistence와 분리하며, disabled/missing/invalid/insufficient prior 상태를 명시적으로 처리하고, enabled priors가 deterministic hard verdict/run truth를 바꾸지 않음을 테스트로 증명한다.

Process note: `.planning/REQUIREMENTS.md`는 아직 SOFT-01을 `Pending`으로 표시하고, `.planning/ROADMAP.md`의 Phase 7 top-level checkbox/progress table도 stale 상태다. 이 검증 보고서는 해당 planning marker를 후속 traceability reconciliation에서 갱신할 수 있는 evidence이며, runtime goal gap은 아니다.

---

_Verified: 2026-04-10T05:21:09Z_  
_Verifier: Codex (gsd-verifier)_
