# 호스팅 HWP 편집기 조사

- 조사일: 2026-07-13 (Asia/Seoul)
- 대상: `https://hwp-editor.agentic-worker.store/`
- 테스트 HML: `/Users/chaeseong-gug/Documents/PARA/Project/ExamBank/exambank-generator/tests/fixtures/serial_curated_min.hml`
- 편집기 런타임: 콘솔 기준 `rhwp 0.7.18`

## 결론

현재 호스팅 편집기는 **ExamBank의 수식 포함 HML 열람·수정·HML 재저장 요구를 충족하지 못한다.** HML 자체는 열리지만 기존 `<EQUATION>` 5개를 모두 건너뛰고, 손실 때문에 HML 저장을 명시적으로 차단한다. 반면 편집기 안에서 새 수식을 만들고 다시 편집하는 기능은 동작하며 결과는 HWP 또는 HWPX로 내보낼 수 있다.

외부 페이지 연동은 가능하다. 실제로 iframe 로딩과 `postMessage`/`MessageChannel` RPC 연결을 검증했다. 단, URL query parameter로 문서 URL을 넘기는 방식과 HML export API는 제공되지 않는다. ExamBank가 오브젝트 스토리지에서 HML 바이트를 받아 iframe으로 전달하고, 편집 결과 HWP/HWPX 바이트를 받아 다시 업로드하는 구조만 현재 API로 가능하다.

## 실제 동작 결과

| 항목 | 결과 | 근거 |
|---|---|---|
| 편집기 진입 | 성공 | 페이지 제목 `rhwp-studio`, WASM 정상 초기화, 페이지 오류 없음 |
| HML 로컬 열기 | 부분 성공 | `.hml`이 허용된 숨김 file input으로 4,087바이트 fixture를 열고 1페이지 렌더링 |
| HML 기존 수식 열람 | 실패 | 상태 경고: `/HWPML/BODY/SECTION/P/TEXT/EQUATION`을 지원하지 않아 건너뜀. fixture의 5개 수식이 문서에서 사라짐 |
| 일반 텍스트 열람 | 성공 | 문제 번호와 한글 본문은 렌더링됨 |
| 새 수식 삽입 | 성공 | `입력 > 수식` 대화상자에서 `x^2 + 1`을 넣어 수식 개체 생성 |
| 생성 수식 수정 | 성공 | 수식 개체 선택 > `개체 속성` > `편집(E)`에서 원문 `x^2 + 1`을 읽고 `x^3 + 2`로 변경 |
| HML 재저장 | 실패 | 저장 대화상자: `보존할 수 없는 요소가 있어 HML 저장이 차단되었습니다.`; `HML로 저장 (저장 불가)` 버튼 비활성화 |
| HWP/HWPX 저장 | 가능 | UI에 두 형식 저장 제공. RPC `exportHwp` 5,632바이트, `exportHwpx` 6,252바이트 반환 확인 |
| 외부 서버 저장 | 없음 | HML 열기·편집·저장 차단 과정에서 문서 업로드 API 요청 없음. 자동 저장 로그는 있으나 외부 요청은 관찰되지 않음 |
| 콘솔/페이지 오류 | 없음 | 폰트·WASM·문서 초기화 로그만 있고 `errors` 출력은 비어 있음 |

## iframe 및 RPC 연동

### 검증된 사실

- 응답에 `Content-Security-Policy: frame-ancestors`와 `X-Frame-Options`가 없고, 실제 중첩 iframe 로딩이 성공했다.
- 부모 origin은 `http:` 또는 `https:`여야 한다. `file:`/`data:` origin은 편집기 코드에서 거부된다.
- 부모가 보낸 `rhwp-connect`와 transferable `MessagePort` 연결이 성공했다.
- 실측 응답:

```json
[
  {
    "type": "rhwp-connected",
    "version": 1,
    "sessionId": "probe-1",
    "capabilities": ["transferable-array-buffer"]
  },
  {
    "type": "rhwp-response",
    "version": 1,
    "sessionId": "probe-1",
    "id": 1,
    "result": true
  },
  {
    "type": "rhwp-response",
    "version": 1,
    "sessionId": "probe-1",
    "id": 2,
    "result": 0
  }
]
```

### 확인된 RPC 메서드

| 메서드 | 용도 |
|---|---|
| `ready` | WASM/편집기 준비 확인 |
| `loadFile` | 바이너리 문서 로드. `params.data`, `params.fileName`, 선택적 `skipUnsavedGuard` 사용 |
| `pageCount` | 페이지 수 |
| `getRendererDiagnostics` | 렌더러 상태 |
| `getPageSvg` | 지정 페이지 SVG |
| `exportHwp` | HWP `Uint8Array` 반환 |
| `exportHwpx` | HWPX `Uint8Array` 반환 |
| `exportHwpVerify` | HWP export 검증 결과 |

`exportHml`, 원격 URL 로드, 저장 콜백, 오브젝트 스토리지 API는 없다. `loadFile`은 URL이 아니라 `Uint8Array`/`ArrayBuffer`를 요구한다.

### 최소 연동 계약

```js
const frame = document.querySelector('#hwp-editor');
const channel = new MessageChannel();
const sessionId = crypto.randomUUID();

channel.port1.onmessage = ({ data }) => {
  // rhwp-connected 또는 id별 rhwp-response 처리
};

frame.contentWindow.postMessage(
  {
    type: 'rhwp-connect',
    version: 1,
    sessionId,
    capabilities: ['transferable-array-buffer'],
  },
  'https://hwp-editor.agentic-worker.store',
  [channel.port2],
);

// ExamBank가 presigned GET으로 받은 HML ArrayBuffer 전달
channel.port1.postMessage({
  type: 'rhwp-request',
  version: 1,
  sessionId,
  id: 1,
  method: 'loadFile',
  params: { data: hmlArrayBuffer, fileName: 'question.hml' },
}, [hmlArrayBuffer]);
```

저장은 `exportHwp` 또는 `exportHwpx` 응답의 `Uint8Array`를 ExamBank가 presigned PUT으로 오브젝트 스토리지에 올리는 방식이다. 편집기 문서 응답에는 `Access-Control-Allow-Origin`도 없으므로 편집기 origin을 문서 저장 API처럼 직접 호출하는 구조로 보면 안 된다. 오브젝트 스토리지 bucket CORS는 ExamBank 웹 origin의 GET/PUT을 별도로 허용해야 한다.

## query parameter 조사

번들에서 확인된 URL parameter는 렌더러 선택용뿐이다.

- `renderer`, `renderBackend`, `backend`
- `canvaskitMode`, `skiaMode`
- `canvaskitSurface`, `skiaSurface`
- `renderProfile`, `profile`
- 디버그 플래그 `compareDebug`

문서 URL, object key, callback URL을 받는 parameter는 확인되지 않았다. 따라서 `?url=<presigned-hml>` 형태는 현재 지원되지 않는다.

## 위험과 권고

1. **현재 배포본으로 HML 수식 POC를 합격 처리하지 않는다.** 원본 수식이 무음 손실이 아니라 경고 후 누락되며, HML round-trip도 불가능하다.
2. 가장 작은 지속 가능한 선택은 둘 중 하나다.
   - 권장: 편집기에서 HML `<EQUATION><SCRIPT>...</SCRIPT></EQUATION>` import/export를 구현한 뒤 동일 fixture로 round-trip 검증.
   - 임시 대안: 저장 형식을 HWPX로 전환하고, HML은 최초 ingest 형식으로만 취급. 이는 “모든 파일은 HML” 요구 변경이므로 제품 결정이 필요하다.
3. 연동은 iframe + RPC를 사용한다. 부모 앱이 스토리지 인증, presigned GET/PUT, 버전 충돌, 저장 성공/실패 UI를 책임져야 한다.
4. 수식 합격 기준은 기존 5개 수식 모두 렌더링, 기존 수식 편집, 새 수식 삽입, 저장 후 재열기, 원본 대비 수식 SCRIPT 보존이다.

## 증빙 파일

- `hosted-editor-loaded.png`: HML 로드 직후 손실 경고
- `hosted-editor-equation-dialog.png`: 새 수식 입력 대화상자
- `hosted-editor-equation-inserted.png`: 새 수식 삽입 결과
- `hosted-editor-equation-edited.png`: 생성 수식 수정 후 선택 상태
