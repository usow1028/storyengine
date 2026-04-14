# Logic3D Narrative App

`logic3d` 프로젝트의 사건, 주체, 인과관계 개념을 참고해 만든 서사창작 전용 3D 블록 그래프 MCP 앱입니다.  
기초 서버 구조는 기존 `geogebra-chatgpt-app` 의 MCP skeleton 을 따라가되, 렌더러는 GeoGebra 대신 순수 canvas 기반 블록식 3D 엔진으로 새로 구성했습니다.

## 포함 기능

- `render_narrative_3d_graph`
  - 구조화된 `actors`, `events`, `causalLinks` 또는 자연어 `storyText` 를 받아 3D 서사 블록 장면을 생성합니다.
- `/preview`
  - ChatGPT 없이도 로컬 브라우저에서 장면을 바로 확인할 수 있습니다.

## 로컬 실행

```bash
cd /home/usow/logic3d/apps/logic3d-narrative-app
npm install
npm start
```

기본 주소:

- MCP 엔드포인트: `http://127.0.0.1:8787/mcp`
- 로컬 미리보기: `http://127.0.0.1:8787/preview`

## 입력 모델

이 앱은 `logic3d` 스타일의 개념을 느슨하게 반영합니다.

- `actors`
  - 인물/주체 레인
- `events`
  - 사건 블록
  - `eventType`, `actorNames` 또는 `actorIds`, `sequence`, `revealRank`, `preconditions`, `effects`
- `causalLinks`
  - `causes`, `enables`, `motivates`, `reveals`, `blocks`, `restores`

축 기본값:

- `x`: 시간 순서
- `y`: 행동 주체
- `z`: 서사 노출/인과 우선도

## 자연어 입력

`events` 없이 `storyText` 만 넣어도 됩니다.  
예를 들어 아래 같은 문장을 서버가 간단히 추출합니다.

```text
상헌은 오전 10시에 잠에서 깨어났다.
엄마는 11시에 출근했다.
묘경은 13시에 네일아트를 받았다.
```

## 검증

```bash
cd /home/usow/logic3d/apps/logic3d-narrative-app
npm run smoke
```

검증 항목:

- MCP 연결
- tool/resource 노출
- 자연어 storyText -> 블록 장면 변환
- canvas widget 리소스 확인

## 추천 프롬프트

```text
이 단편을 logic3d 방식의 서사 3D 블록 그래프로 변환해줘.
x축은 시간 순서, y축은 행동 주체, z축은 독자에게 드러나는 인과 우선도야.
같은 인물의 사건은 흐름선으로 이어주고, 직접적인 인과는 relation 별 링크로 표시해줘.
```
