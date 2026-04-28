# PR #397 시각 검증 자료

PR #397 (수식 ATOP 파싱 및 렌더링 보정) 의 export-svg 풀 파이프라인 출력 첨부.

## 생성 절차

베이스: `samples/equation-lim.hwp` (기존 OVER 수식 포함)

```bash
# 1. 베이스 HWP 의 equation script 만 ATOP / OVER / 그룹으로 교체
cargo run --release --example atop_visual_demo
# → output/svg/pr397-visual/atop.hwp, over.hwp, atop_group.hwp

# 2. export-svg 풀 파이프라인 실행
./target/release/rhwp.exe export-svg output/svg/pr397-visual/atop.hwp       -o output/svg/pr397-visual/atop_out/
./target/release/rhwp.exe export-svg output/svg/pr397-visual/over.hwp       -o output/svg/pr397-visual/over_out/
./target/release/rhwp.exe export-svg output/svg/pr397-visual/atop_group.hwp -o output/svg/pr397-visual/atop_group_out/
```

## 결과 비교

| 파일 | script | `<text>` | `<line>` (분수선) |
|------|--------|----------|------|
| `atop.svg` | `a atop b` | 2 | 0 (분수선 미생성) |
| `over.svg` | `a over b` | 2 | 1 (분수선 유지 — 회귀 확인) |
| `atop_group.svg` | `{x+y} atop {u-v}` | 6 | 0 (그룹 케이스도 ATOP 의미 보존) |

## 파일

- `atop.svg` — ATOP 케이스 export-svg 출력
- `over.svg` — OVER 케이스 export-svg 출력 (회귀 확인용)
- `atop_group.svg` — 그룹 케이스 export-svg 출력
- `atop_visual_demo.rs` — 위 변형을 생성하는 example 소스 (재현용)
