# Build Result

## 결론

`poc/hml-web-viewer/`에서 공개 호스트 embed, 세 가지 load flow, 상태·오류 표시를 구현했다.
수식 HWP와 일반 HML 로드는 성공했지만, 수식 HML은 기존 `<EQUATION>`을 누락한다. 공개 호스트의
`exportHml` 부재는 실제 RPC 오류로 판정한다.

## 변경

- 독립 정적 HTML/CSS/ES module POC.
- version/session-bound MessageChannel v1 RPC client와 transferable binary copy.
- 저장소 sample, local file, CORS remote GET load flow.
- ready/loadFile/pageCount/exportHml timeout 및 구조화된 오류 처리.
- Node 내장 test runner 계약 테스트 7개.

## 결정과 대안

- 초기에는 저장소 밖 `serial_curated_min.hml` 복사를 보류했다. 이후 소유자의 명시적 요청과 synthetic fixture임을 확인해 원본을 그대로 복사하고 마지막 LF 1바이트만 추가했다.
- HWP→HML 생성 거절: native CLI는 `HML_SOURCE_REQUIRED`, pyhwp는 HWPML이 아닌 진단 XML 생성.
- 지원되는 척하는 export/download 대안 거절: 공개 router에 메서드가 없으므로 실제 오류를 차단 상태로 노출.

## 검증

- `npm test`: 7/7 PASS.
- 로컬 HTTP + headed browser: host 연결, HWP/HML 각각 1페이지 load PASS.
- `exportHml`: `Unknown method: exportHml` → 친화적 저장 차단 안내 PASS.
- console/errors: empty.

정확한 재실행 명령과 증빙은 `QA.md`에 기록했다.
