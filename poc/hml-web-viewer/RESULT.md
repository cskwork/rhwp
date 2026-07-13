# Result

## 판정

iframe + MessageChannel v1로 공개 호스트에 연결하고 저장소 수식 HWP 및 HML을 로드하는
경로는 동작한다. HML 수식 round-trip 저장은 현재 불가능하다.

## 증거

- `equation-lim.hwp`: RPC load 성공, 1페이지 렌더링.
- `formatting_table.hml`: RPC load 성공, 1페이지 렌더링. 호스트가 미지원 HML 요소 경고 표시.
- `exportHml`: 실제 RPC가 `Unknown method: exportHml`을 반환하며 POC가 사용자 친화적 차단 상태 표시.
- 원격 GET: 부모 페이지가 bytes를 가져와 transferable `Uint8Array`로 iframe에 전달.

## Fixture 결정

초기에는 라이선스·출처 경계를 확인할 수 없어 저장소 밖 ExamBank fixture 복사를 보류했다.
이후 소유자의 명시적 요청과 synthetic fixture임을 확인해 이미 최소화된 원본 4,087바이트를
그대로 복사하고 마지막 LF 1바이트만 추가한 `samples/exambank-math.hml`을 사용했다.
원본 SHA-256은 `66998b57e70d38175e68facc3bf2fb2b7e6e0839c41c012acb47209d3071c538`,
저장소 fixture SHA-256은 `b51be49cde780d39b92f42cfd1cbd58474900c46c12c4df971f79bd511c7045a`다.

`rhwp export-hml`은 HML-origin만 허용하고 pyhwp XML 출력도 HWPML이 아닌 진단용
`<HwpDoc>`이므로 HWP→HML fixture를 새로 만들 수 없다는 조사 결과는 그대로 유효하다.

## ExamBank 권고

부모 앱이 signed GET/PUT과 충돌 제어를 담당하고 iframe에는 bytes만 전달한다. HML을 최종
저장 형식으로 유지하려면 호스트에 `<EQUATION>/<SCRIPT>` import와 `exportHml` 공개 RPC를
먼저 추가해야 한다. 그 전에는 HWP/HWPX 저장으로 제품 요구를 변경하는 결정이 필요하다.
