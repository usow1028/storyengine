# Phase 1: Canonical Narrative Schema - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 01-Canonical Narrative Schema
**Areas discussed:** 모델 단위, 시간·공간 표현, 규칙 표현 방식, 기준 DB 구조

---

## 모델 단위

| Option | Description | Selected |
|--------|-------------|----------|
| 문장/행동 단위 | 서술을 거의 그대로 잘게 쪼개는 방식 | |
| 장면/비트 단위 | 장면 중심으로 묶는 방식 | |
| 상태 변화를 만드는 인과 단위 | 상태 변화를 일으키는 사건을 canonical event로 저장하는 방식 | ✓ |

**User's choice:** 상태 변화를 만드는 인과 단위, 그리고 추상 사건도 포함
**Notes:** 배신, 고백, 계약 같은 추상 사건도 canonical event에 포함하되, 최소 하나 이상의 상태 변화나 규칙 변화와 연결되어야 한다.

| Option | Description | Selected |
|--------|-------------|----------|
| 고정 슬롯형 | 핵심 상태 필드를 강하게 고정하는 방식 | |
| 핵심 슬롯 + 확장 속성 | 공통 판정 축은 고정하고 작품 특수 상태는 확장하는 방식 | ✓ |
| 완전 개방형 속성 그래프 | 거의 전부를 자유 속성 그래프로 두는 방식 | |

**User's choice:** 핵심 슬롯 + 확장 속성
**Notes:** v1의 판정 안정성을 위해 공통 상태축이 먼저 존재해야 한다.

---

## 시간·공간 표현

| Option | Description | Selected |
|--------|-------------|----------|
| 절대 시각 중심 | 시간을 최대한 하나의 절대 timeline으로 환산 | |
| 상대 순서 중심 + 필요 시 절대시간 보조 | 관계 중심으로 두고 절대 시각은 보조로만 쓰는 방식 | ✓ |
| 불명/모호 시간 허용 중심 | 정확한 시간 확정을 최대한 피하는 방식 | |

**User's choice:** 상대 순서 중심 + 필요 시 절대시간 보조
**Notes:** `before`, `after`, `during`, `same-window`, `unknown` 같은 관계 모델이 기본축이 된다.

| Option | Description | Selected |
|--------|-------------|----------|
| 서술형 장소명 중심 | 장소를 텍스트 이름 위주로 저장 | |
| 장소 엔티티 + 포함 관계 + 선택적 좌표/이동 제약 | 장소 계층과 이동 제약을 함께 모델링 | ✓ |
| 좌표/지도 중심 | 좌표 기반 모델을 우선하는 방식 | |

**User's choice:** 장소 엔티티 + 포함 관계 + 선택적 좌표/이동 제약
**Notes:** 이동 가능성은 장소 계층과 최소 이동시간 제약을 기준으로 계산한다.

---

## 규칙 표현 방식

| Option | Description | Selected |
|--------|-------------|----------|
| DB 테이블 중심 | 규칙을 거의 전부 DB 레코드/JSON으로 관리 | |
| DB 메타데이터 + 별도 실행 규칙 파일 | 메타데이터와 실행 규칙을 분리하는 방식 | ✓ |
| 완전한 자체 DSL 중심 | 처음부터 독자 DSL을 중심에 두는 방식 | |

**User's choice:** DB 메타데이터 + 별도 실행 규칙 파일
**Notes:** 사람이 편집하는 규칙 정보와 솔버가 실행하는 규칙 본체를 분리한다.

| Option | Description | Selected |
|--------|-------------|----------|
| 사전 정의된 템플릿 선택형 | 준비된 규칙만 켜는 방식 | |
| 템플릿 + 제한된 파라미터 편집형 | 규칙 틀은 정하고 세부만 수정 | |
| 자유 규칙 작성형 | 사용자가 자유롭게 규칙을 작성 | ✓ |

**User's choice:** 자유 규칙 작성형
**Notes:** v1 난도를 높이지만, 사용자 정의 세계관 표현 자유도를 유지하기 위해 허용한다.

| Option | Description | Selected |
|--------|-------------|----------|
| 자연어 규칙 작성 + 내부 변환 | 자연어 규칙을 내부 형식으로 변환 | ✓ |
| 구조화 규칙 편집기 + 자유 서술 보조 | 구조화 입력 위주, 서술 보조 추가 | |
| 전용 규칙 DSL 직접 작성 | 사용자가 DSL을 직접 작성 | |

**User's choice:** 자연어 규칙 작성 + 내부 변환
**Notes:** 자유 규칙 입력은 허용하되, 엔진 내부에서는 검증 가능한 형식으로 정규화되어야 한다.

---

## 기준 DB 구조

| Option | Description | Selected |
|--------|-------------|----------|
| PostgreSQL 중심 + 필요 시 그래프 투영 | 정본은 Postgres, 그래프는 읽기 투영으로 추가 | ✓ |
| 그래프 DB 중심 + 관계형 보조 | 그래프를 중심에 두고 관계형을 보조로 둠 | |
| 이중 정본 | Postgres와 그래프 DB를 동시에 정본으로 사용 | |

**User's choice:** PostgreSQL 중심 + 필요 시 그래프 투영
**Notes:** 운영 정본과 판정 이력은 PostgreSQL에 두고, 그래프 탐색은 후속 읽기 모델로 분리한다.

## the agent's Discretion

- Core state slot 이름과 구체 필드 명세
- Relational column과 `jsonb` 확장 필드의 정확한 경계
- Rule-file 디렉터리 구성과 solver adapter 내부 구조

## Deferred Ideas

None.
