# 수식 HWP → HML fixture 조사

## 결론

저장소에는 수식 `.hwp`를 호스팅 편집기가 읽는 standalone HWPML `.hml`로 변환하는 명령이 없다.

- `rhwp export-hml`은 **HML 원본만 HML로 재직렬화**한다. `.hwp` 입력은
  `HML_SOURCE_REQUIRED`로 거부하도록 테스트되어 있다
  (`src/main.rs:170`, `src/main.rs:4323`, `tests/hml_cli.rs:190`).
- `pyhwp`의 `hwp5proc xml`은 HWP를 XML로 풀 수 있지만 결과 root가 `<HwpDoc>`인
  pyhwp 분석 XML이다. 호스팅 편집기 fixture의 `<HWPML>` 문서가 아니다.
- 따라서 `samples/equation-lim.hwp`를 POC의 `.hml` fixture로 이름만 바꿔 쓰면 안 된다.

## 실행한 정확한 명령

`pyhwp 0.1b15`를 저장소 밖 `/tmp` 가상환경에 설치한 뒤 다음을 실행했다.

```bash
/tmp/rhwp-fixture-probe-venv/bin/hwp5proc xml \
  --output /tmp/equation-lim.hml \
  samples/equation-lim.hwp
```

명령 자체는 exit 0이었다. 출력은 UTF-8 XML 42,084바이트이며 SHA-256은
`5e42ff8917b2c80b331f303c2201e068bc96c9c95885cce98310a6424e368649`다.

도움말로 확인한 일반형은 다음과 같다.

```text
hwp5proc xml [--embedbin] [--no-xml-decl] [--output <file>]
             [--format flat|nested] <hwp5file>
```

## 수식 태그 확인

생성 XML의 관련 토큰 수:

| 토큰 | 개수 | 판정 |
|---|---:|---|
| `<HwpDoc version="5.1.1.0">` | 1 | pyhwp 분석 XML root |
| `chid="eqed"` | 1 | 수식 control은 감지 |
| `<EqEdit/>` | 1 | 비어 있는 수식 편집 control |
| `<HWPML>` | 0 | standalone HML 아님 |
| `<EQUATION>` | 0 | 호스팅 편집기가 기대하는 수식 개체 없음 |
| `<SCRIPT>` | 0 | 수식 원문 없음 |

즉, **수식 control 표식은 있으나 수식 내용 태그는 없다.** 이 출력으로는 수식 열람·편집
POC를 증명할 수 없다.

## 사용 가능한 fixture

기존 브라우저 조사에서 사용한
`/Users/chaeseong-gug/Documents/PARA/Project/ExamBank/exambank-generator/tests/fixtures/serial_curated_min.hml`
은 standalone `<HWPML>`이며 `<EQUATION><SCRIPT>...</SCRIPT></EQUATION>` 수식 5개를 포함한다.
현재 POC에서는 이 실물 fixture를 명시적으로 복사하거나, 해당 저장소를 함께 제공하는
방식이 가장 작은 유효 경로다. 다만 현재 작업공간의 filesystem policy로 원본 파일을 직접
읽거나 복사할 수 없어 이 조사에서는 기존 브라우저 증거만 확인했다.

## 후속 결정

이 조사 이후 소유자가 PR 회귀 suite 포함을 명시적으로 요청했고, 원본이 이미 최소화된
synthetic fixture임을 확인했다. 따라서 원본 4,087바이트를 그대로 복사하고 마지막 LF
1바이트만 추가해 `poc/hml-web-viewer/samples/exambank-math.hml`로 보존했다.

- 원본 SHA-256: `66998b57e70d38175e68facc3bf2fb2b7e6e0839c41c012acb47209d3071c538`
- 저장소 fixture SHA-256: `b51be49cde780d39b92f42cfd1cbd58474900c46c12c4df971f79bd511c7045a`

## 대안 검토

1. 권장: `serial_curated_min.hml`을 provenance와 함께 POC 전용 fixture로 복사한다.
2. 한컴오피스 Save As로 실제 HWPML `.hml`을 만든다. 자동화 경로가 추가로 필요하다.
3. 제외: `hwp5proc xml` 출력을 `.hml`로 사용하는 방법. root와 수식 구조가 호환되지 않는다.
4. 제외: `rhwp export-hml samples/equation-lim.hwp ...`. 명령 계약상 HML 원본만 허용한다.
