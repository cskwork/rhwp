# HML Web POC

## Original Request

별도 폴더 에서 웹에서 hml 파일 열리고

웹에서 수정이 가능한 다음에

웹에서 스토리지로 hml 저장되면 되는거지

hml 파일은 모두 오브젝트스토리지에 있는거고

여기서 수정은 수식편집기가 무조건 되어야 하는 정도지
  이거 테스트를 하고 싶어.. html에서 수학 서식 hml 열람되는 거 poc  만들어서 열어줘 /Users/chaeseong-gug/Documents/PARA/Project/ExamBank/exambank-generator 여기서 열람할 때 쓸거야 호스팅된 - https://hwp-editor.agentic-worker.store/

## Prototype Frame

- Question: 호스팅된 rhwp 편집기를 HTML에 삽입해 수식이 포함된 HML을 열람·편집할 수 있는가?
- Decision signal: 로컬 POC에서 수식 HML 바이트를 호스트에 전달했을 때 문서 페이지와 수식이 렌더링되고 편집기 UI가 활성화된다.
- Prototype type: UI/interaction + data/API.
- Exit path: `poc/hml-web-viewer/`에 격리. 성공 시 ExamBank의 실제 검토 화면으로 LEGACY 통합하고, 실패 시 호스트 embed 계약을 보완한다.

## Success Criteria

- [x] `npm test`에서 embed 연결, HML 로드 요청, 실패 상태를 검증한다.
- [x] 한 명령으로 POC 서버를 실행할 수 있다.
- [x] 샘플 수식 HML 또는 사용자가 고른 로컬 HML을 호스팅 편집기에 로드한다.
- [x] 오브젝트 스토리지 GET URL을 입력해 HML을 불러올 수 있다(CORS 오류는 명확히 표시).
- [x] 수식 편집 절차가 화면에 안내되고, 호스팅 편집기에서 편집 UI를 사용할 수 있다.
- [x] HML 스토리지 재저장 가능 여부를 실제 embed RPC 응답으로 판정해 표시한다.
- [x] headed 브라우저에서 실제 렌더링 결과를 확인한다.

## Non-goals

- 운영 오브젝트 스토리지 쓰기
- ExamBank 제품 코드 변경
- 호스팅된 편집기 배포 변경
- 인증·서명 URL 발급 구현
