# Quick Task Plan

- Quick ID: `260414-tpz`
- Description: `Add narrative 3D graph app and push to origin/main`
- Date: `2026-04-14`

## Goal

`logic3d` 저장소 안에 서사창작 전용 3D 블록 그래프 MCP 앱을 편입하고, 로컬 검증 후 GitHub `origin/main` 으로 푸시한다.

## Tasks

1. 기존 외부 작업 디렉터리의 앱을 `apps/logic3d-narrative-app` 으로 저장소 내부에 편입한다.
2. 저장소 잡음인 `.codex/` 를 `.gitignore` 에 추가해 작업트리를 안정화한다.
3. 새 앱 경로 기준으로 `npm install`, `node --check server.js`, `npm run smoke` 를 실행해 로컬 동작을 확인한다.
4. 기능 변경을 커밋하고, quick-task 문서 및 `STATE.md` 기록을 남긴 뒤 원격으로 푸시한다.
