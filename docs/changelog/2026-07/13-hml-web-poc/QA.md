# QA

- Verdict: PASS

Backward-trace: clean

PASS는 현재 호스팅 편집기가 수식 HML 저장을 지원한다는 뜻이 아니다. POC가 구버전 호스트의
실제 `EQUATION` 손실 경고와 `exportHml` 차단을 성공으로 가장하지 않고 그대로 보여준다는 판정이다.

## Results

- [x] 저장소 계약 테스트 7개가 모두 통과했다.
- [x] POC JavaScript 3개 파일의 Node 구문 검사가 통과했다.
- [x] POC와 ExamBank 수학 HML fixture가 기존 로컬 서버에서 각각 HTTP 200으로 제공됐다.
- [x] ExamBank fixture의 `<EQUATION>` 4개를 확인했고, 브라우저에서 HML 1페이지 로드 완료를 확인했다.
- [x] 호스팅 편집기가 `EQUATION` 미지원·건너뛰기 경고와 총 5건 이슈를 표시했다.
- [x] `exportHml` 호출 뒤 POC 상태가 `blocked`가 됐고 성공 문구는 나타나지 않았다.
- [x] 존재하지 않는 원격 HML의 HTTP 404가 사용자용 가져오기 오류로 표시됐다.
- [x] 고정 viewport의 접근성 snapshot에서 제목, 입력 label, iframe title과 주요 control을 확인했다.

## QA

- Tool: playwright-cli
- Driver: `playwright-cli 0.1.14`, system Chrome (`--browser=chrome`)
- Served URL: `http://127.0.0.1:8765/poc/hml-web-viewer/`
- Viewport: `1440x1100`
- Server lifecycle: 기존 `python3 -m http.server`가 HTTP 200으로 응답해 재사용했다. 이 QA가 시작한 프로세스가 아니므로 종료하지 않았다.
- Navigation map: `.domain-agent/qa/nav-map.md` 없음. 이번 작업의 허용 쓰기 범위가 run vault로 제한되어 새 map은 만들지 않았다.

| Slice | Exact command | Source | Result |
|---|---|---|---|
| RPC/load/status contract | `cd poc/hml-web-viewer && npm test` | frozen_repo | PASS, 7/7 |
| JavaScript syntax | `cd poc/hml-web-viewer && node --check app.js && node --check rpc-client.js && node --check load-flows.js` | frozen_repo | PASS |
| Static serving | `curl -sS -D - -o /dev/null http://127.0.0.1:8765/poc/hml-web-viewer/` and fixture URL | evaluator_owned | PASS, both HTTP 200 |
| Fixture identity | `shasum -a 256 poc/hml-web-viewer/samples/exambank-math.hml` and `rg -o '<EQUATION' ... \| wc -l` | evaluator_owned | PASS, SHA-256 `b51be49cde780d39b92f42cfd1cbd58474900c46c12c4df971f79bd511c7045a`, 4 equations |
| Browser open | `playwright-cli -s=hml-poc-qa open http://127.0.0.1:8765/poc/hml-web-viewer/ --browser=chrome` | evaluator_owned | PASS, title `HML Web Viewer POC`, hosted iframe connected |
| Golden load | `playwright-cli -s=hml-poc-qa click "#load-hml"` then `run-code` assertions | evaluator_owned | PASS, `exambank-math.hml · 1페이지 로드 완료`; hosted body contains `지원하지 않는 HML 요소를 건너뛰었습니다: EQUATION` |
| Export boundary | `playwright-cli -s=hml-poc-qa click "#export-hml"` then `run-code` assertions | evaluator_owned | PASS, `data-kind=blocked`, `falseSuccess=false` |
| Negative GET | fill missing fixture URL, click `#load-remote`, then `run-code` assertions | evaluator_owned | PASS, `data-kind=error`, `문서를 가져오지 못했습니다: HTTP 404` |
| Browser network | `playwright-cli -s=hml-poc-qa requests --static` | evaluator_owned | PASS, POC/host/sample GET 200; deliberate missing sample GET 404 |
| Accessibility | `playwright-cli -s=hml-poc-qa snapshot` | evaluator_owned | PASS, Korean title/labels, live status, iframe title and controls represented |

Golden path: 호스트 연결 → ExamBank HML GET 200 → RPC load → 1페이지 완료 → 호스트의
HML 2.91/EQUATION 손실 경고 → `exportHml` 실제 호출 → 사용자용 `blocked` 상태. 경고에는
`지원하지 않거나 변환된 요소 5건`, 표시된 EQUATION 3건, `그 외 2건`이 함께 나타난다.

Edge path: 존재하지 않는 같은-origin HML GET은 404이며 `문서를 가져오지 못했습니다: HTTP 404`로
노출된다. Console error는 `/favicon.ico` 404와 의도한 missing fixture 404뿐이다.

Screen to network:

- POC entry → `GET /poc/hml-web-viewer/` → 200
- Hosted editor iframe → `GET https://hwp-editor.agentic-worker.store/` → 200
- ExamBank 수학 HML → `GET /poc/hml-web-viewer/samples/exambank-math.hml` → 200
- Negative remote GET → `GET /poc/hml-web-viewer/samples/missing.hml` → 404

Evidence:

- `qa/as-is-hosted-editor.png`: 1440x1100, HML 1페이지 완료와 호스트 EQUATION 경고.
- `qa/to-be-hml-poc.png`: 같은 route/viewport, POC의 `exportHml` 저장 차단 상태.
- `qa/as-is-hosted-editor.yml`, `qa/to-be-hml-poc.yml`: 두 상태의 접근성 snapshot.
- `qa/initial-a11y.yml`, `qa/edge-404-a11y.yml`: 초기 연결 및 negative/a11y 상태.

## Reproduction Fidelity

- Fidelity level: exact
- Production correspondence: 실제 공개 호스트 `https://hwp-editor.agentic-worker.store/`, 저장소 POC, 저장소 ExamBank fixture를 변형 없이 사용했다.
- Residual risk from data gap: 현재 배포본의 exact 동작은 확인했지만, 아직 배포되지 않은 수식 지원 패치의 동작은 이 판정 범위 밖이다.
- Post-deploy confirmation plan: 호스트 패치 배포 뒤 같은 fixture로 EQUATION 4개 렌더링, 경고 0건, `hmlSavable=true`, `exportHml` round-trip을 다시 검증한다.
