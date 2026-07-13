# Plan

## Intent

- Outcome: 호스팅 편집기를 사용하는 독립 HTML POC에서 수식 HML 열람·편집 가능성을 증명한다.
- Proof: 정적 테스트 + 로컬 HTTP 서버 + headed 브라우저에서 샘플 HML 로드.
- Stop condition: 열람·편집 신호를 확인하고, HML 스토리지 저장의 지원/차단 지점을 증거로 기록한다.
- max_iterations: 4

## Approval

- Status: auto-approved
- Rationale: 2026-07-13 사용자의 "POC 만들어서 열어줘" 요청에 따라 자율 실행 승인으로 기록.

## Theory

실제 업무 흐름은 `object storage GET -> parent HTML -> hosted editor iframe -> edit -> HML export -> signed PUT`이다. 현재 호스트는 부모가 HML 바이트를 전달하는 `MessageChannel` embed 계약과 내부 HML 편집/내보내기 엔진을 갖고 있지만, 공개 RPC에는 `exportHml`이 없다. POC는 읽기/편집 경로를 실제로 실행하고 저장 경로는 `exportHml` 호출 결과로 판정한다.

## Steps

1. 샘플 수식 HWP를 HML fixture로 변환하고 수식 태그를 확인한다.
2. `poc/hml-web-viewer/`에 의존성 없는 정적 HTML/CSS/JS와 작은 테스트를 만든다.
3. iframe에 MessageChannel v1로 연결해 `ready`, `loadFile`, `pageCount`, `exportHml`을 호출한다.
4. 샘플, 로컬 파일, 원격 GET URL 입력을 지원하고 상태·오류를 화면에 노출한다.
5. 테스트 후 로컬 서버를 띄워 headed 브라우저에서 호스팅 편집기와 수식 렌더링을 확인한다.
6. 결과와 ExamBank 통합 권고를 `RESULT.md`에 기록한다.

## Design Read

Reading this as: 개발자가 연동 가능성을 판단하는 기술 POC, 차분한 중립 UI와 높은 정보 밀도. `DESIGN_VARIANCE=4`, `MOTION_INTENSITY=2`, `VISUAL_DENSITY=7`.

## Verification

- `npm test`
- HTML/JS 정적 구조 검사
- `python3 -m http.server`로 로컬 제공
- `agent-browser --headed`에서 연결 및 샘플 로드 확인
- 브라우저 console/errors와 screenshot 확인
