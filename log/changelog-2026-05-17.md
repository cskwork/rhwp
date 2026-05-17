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

## Problem-bank corpus accuracy audit

- Goal: verify the new math corpus under `/Users/danny/Downloads/문제은행-한글` without copying or committing copyrighted HWP/HWPX files.
- Finding: the corpus contains 98 `.hwp` files and 1 `.hwpx` file. `export-html` already parses both via format detection, but the CLI help only advertised `.hwp`.
- Verification artifact: exported 99/99 documents to `/private/tmp/rhwp-problembank-html-20260517`, producing 6,812 HTML pages with 565,282 equation SVG markers and 7,371 tables. No generated corpus content was placed in the repo.
- Finding: every exported document contained equation markers. The main remaining 1:1 risk is layout overflow/pagination drift; several files emit `LAYOUT_OVERFLOW` diagnostics during render.
- Fix: `rhwp export-html --help` now prints command help instead of treating `--help` as a filename, and the command documents HWP/HWPX input support.
- Fix: inline equation `COLOR{R,G,B}{...}` now scopes SVG/canvas/native-Skia equation color to the body instead of silently rendering it with the inherited equation color.
- Fix: the external equation fixture round-trip test now scans `.hwp` and `.hwpx` files and renders the actual page containing the edited equation, not always page 0; unrelated page render errors are skipped while searching.
- Fix: the minimal CFB writer now emits DIFAT sectors when a large exported HWP needs more than 109 FAT sectors. This fixes strict CFB reload for large math documents with many embedded BinData streams.
- Verification: the previous failing large corpus file now converts and reloads with `rhwp info`; after review hardening, the full env-gated corpus equation edit/export/reload gate passed for all 99 documents in 330.00s.

## RHWP math/equation HTML positioning fidelity

- Root cause: multi-column math documents encoded equation/control placement in `LINE_SEG.vertical_pos`, while the typeset pass used only accumulated paragraph height for some equation-adjacent controls. That let the layout pass correct visual y positions after pagination had already accepted the item, causing bottom overflow and visible vertical drift in exported HTML.
- Fix: align typeset fit checks with layout vpos correction for equation/control flow, keep equation PageItems from resetting layout vpos bases, reserve non-TAC picture/shape visual height around equation flow, and emit HTML structural table wrappers without adding offset parents.
- Guardrails: kept the vpos policy scoped to equation/control flow because a broader text-only vpos policy regressed `samples/exam_eng.hwp` from 8 to 11 pages.
- Verification: focused copyrighted input export now generates 157 HTML pages with 0 real `LAYOUT_OVERFLOW`; equation-focused tests, `exam_eng_multicolumn`, and `cargo build` pass. Wider 98-file corpus still has 40 real-overflow docs, so global 1:1 accuracy is not complete yet.
