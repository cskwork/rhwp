# Changelog 2026-05-17

## RHWP math HWP to HTML fidelity slice

- Goal: improve 1:1 HWP math document conversion into RHWP editor/export flows, prioritizing formula positioning and HTML export fidelity.
- Finding: equation parsing, editor APIs, SVG rendering, and HWP/HWPX serialization already existed, but `HtmlRenderer` skipped `RenderNodeType::Equation`; HTML output lost visible formulas unless debug control marks were enabled.
- Decision: reuse the existing equation layout/SVG fragment in HTML export instead of creating a second math renderer. This keeps equation geometry consistent with the current SVG/canvas pipeline.
- Change: `HtmlRenderer` now emits an absolutely positioned `.hwp-equation` element with inline SVG text, bbox scaling, and `data-rhwp-control="equation"` plus source control metadata for editor-addressable mapping.
- Change: CLI gained `rhwp export-html <file.hwp>`, writing page HTML documents and preserving external image loading plus paragraph/control mark options.
- Tests: added `tests/equation_html_export.rs` for direct HTML rendering and CLI export on `samples/equation-lim.hwp`.
- Verification: focused HTML equation tests passed, existing equation parser/layout regression passed, HTML renderer unit tests passed, `cargo build` passed, and all 27 page-0 math HWP files under `/Users/danny/Documents/PARA/Resource/hwp-to-html-parser/input` exported with equation markers.
- Not done: no PR created; final visual review is still reserved for the user.
- Finding: imported equations carried `raw_ctrl_data` for the original CTRL_HEADER geometry; after editing an equation, serializer reused stale geometry while writing the new EQEDIT script, so reload could shift the HTML equation bbox.
- Fix: clearing equation `raw_ctrl_data` after property edits forces HWP export to regenerate CTRL_HEADER geometry from the updated `eq.common` width/height.
- Tests: added imported-equation edit/export/reload coverage and an env-gated real-fixture round-trip test (`RHWP_MATH_FIXTURE_DIR`) for the local math HWP corpus.
- Verification: existing equation coordinate/duplication regressions also passed (`cargo test --test issue_595`, `cargo test --test issue_301`).
- Verification: generated WASM package with `docker compose --env-file .env.docker run --rm wasm`, installed Studio deps using a temp npm cache, and `npm run build` in `rhwp-studio` passed. Initial Studio build failed only because `pkg/` and `node_modules/` were absent.
