# HML Web Viewer POC

공개 rhwp 호스팅 편집기를 `MessageChannel` v1으로 임베드해 문서 GET, 로컬 파일 로드,
페이지 확인, HML export 지원 경계를 검증하는 의존성 없는 정적 POC입니다.

## 실행

저장소 루트에서 실행합니다.

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

브라우저에서 `http://127.0.0.1:8765/poc/hml-web-viewer/`를 엽니다. 저장소 샘플 경로를
그대로 GET하므로 POC 하위 폴더가 아니라 저장소 루트를 제공해야 합니다.

```bash
cd poc/hml-web-viewer
npm test
```

## 확인 범위

- `samples/equation-lim.hwp`: 수식 HWP 열람·편집 신호
- `poc/hml-web-viewer/samples/exambank-math.hml`: ExamBank 수학 HML의 기존 수식 4개 import 경계
- 로컬 HWP/HWPX/HML 및 CORS가 허용된 원격 GET URL
- 실제 `exportHml` RPC 호출 결과

## Fixture provenance

- `samples/exambank-math.hml`은 권한이 확인된 ExamBank의 이미 최소화된 synthetic 회귀 fixture를 사용합니다.
- 원본 SHA-256: `66998b57e70d38175e68facc3bf2fb2b7e6e0839c41c012acb47209d3071c538`
- 저장소 fixture SHA-256: `b51be49cde780d39b92f42cfd1cbd58474900c46c12c4df971f79bd511c7045a`
- 변환: 원본 4,087바이트를 그대로 복사하고 마지막 LF 1바이트만 추가했습니다.

2026-07-13 검증 당시 공개 호스트는 `exportHml` RPC를 제공하지 않았습니다. POC는 성공을 가장하지 않고 실제
`Unknown method: exportHml` 응답을 저장 차단 안내로 표시합니다. 현재 CLI 역시 HML-origin
문서만 HML로 다시 저장하므로, HWP 샘플을 합법 HWPML fixture로 변환할 수 없습니다.
