# Draft release notes — Math/equation HTML positioning fidelity

> Status: draft for reviewer validation. No GitHub Release tag has been created from this note.
>
> Upstream credit: RHWP is originally authored and maintained as the open source project [`edwardkim/rhwp`](https://github.com/edwardkim/rhwp). This work is prepared on the `cskwork/rhwp` fork for contribution review, with respect to the original author and upstream project history.

## Summary

This update improves 1:1 HTML positioning for HWP/HWPX math documents, especially multi-column pages that mix equations, pictures, shapes, and treat-as-character tables.

## User impact

- Better vertical placement of equations in exported HTML.
- Reduced equation-adjacent object drift in multi-column math worksheets.
- HTML table rendering now separates structural table semantics from absolute visual frames, avoiding wrapper offsets that could shift positioned descendants.
- Safer pagination/layout agreement for equation PageItems, so layout-time vpos correction does not fight the earlier typeset fit decision.

## Technical changes

- Use HWP `LINE_SEG.vertical_pos`-aware fit checks for equation/control flow in the typeset pass.
- Keep equation shapes from resetting layout vpos bases.
- Reserve visual height for non-TAC picture/shape controls after equation flow.
- Apply vpos-aware fitting to TAC table placement in equation flow.
- Use `display: contents` for structural HTML wrappers that should not create offset parents.
- Emit visual table/cell frames separately from semantic table markup.

## Verification evidence

- Focused copyrighted math HWP export: 157 HTML pages generated with `LAYOUT_OVERFLOW=0`.
- `cargo test renderer::typeset::tests::multicolumn_equation -- --nocapture`: pass.
- `cargo test --test exam_eng_multicolumn -- --nocapture`: pass.
- `cargo test equation_ -- --nocapture`: pass.
- `cargo build`: pass.
- Local HTML review server used: `http://localhost:18770/`.

## Known limits

- This is not yet a global 100% positioning release.
- Wider batch verification still found real body overflows in 40 corpus documents, so follow-up pagination/layout fixes are still required before claiming full corpus parity.
- Copyrighted input HWP/HWPX files and generated HTML artifacts are intentionally excluded from git.

## Commit references

- `57f070bc` — Improve math equation HTML round-trip fidelity.
- `851fe070` — Improve math HTML positioning fidelity.
