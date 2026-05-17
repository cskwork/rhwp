//! HTML export regression for editable HWP equation controls.
//!
//! Fidelity target: equations must not degrade to a control marker in HTML;
//! the exported page needs positioned, SVG-backed equation content that can be
//! mapped back to the source control for editor affordances.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use rhwp::wasm_api::HwpDocument;

#[test]
fn html_export_renders_positioned_equation_svg_from_hancom_hwp() {
    let bytes = fs::read("samples/equation-lim.hwp").expect("read equation sample");
    let doc = HwpDocument::from_bytes(&bytes).expect("parse equation sample");

    let html = doc.render_page_html_native(0).expect("render html page 0");

    assert!(
        html.contains("class=\"hwp-equation\""),
        "equation must be exported as a positioned HTML element, not skipped:\n{html}"
    );
    assert!(
        html.contains("data-rhwp-control=\"equation\""),
        "equation export must preserve an editor-addressable control marker:\n{html}"
    );
    assert!(
        html.contains("<svg") && html.contains("<text"),
        "equation export must include SVG text content for visual fidelity:\n{html}"
    );
    assert!(
        html.contains("position:absolute") && html.contains("transform=\"scale"),
        "equation export must preserve absolute bbox positioning and HWP bbox scaling:\n{html}"
    );
    assert!(
        html.contains("Lim") || html.contains("lim"),
        "equation script should render visible formula text in HTML:\n{html}"
    );
}

#[test]
fn cli_export_html_writes_equation_backed_page() {
    let out_dir =
        std::env::temp_dir().join(format!("rhwp-equation-html-export-{}", std::process::id()));
    fs::create_dir_all(&out_dir).expect("create temp export dir");

    let status = Command::new(env!("CARGO_BIN_EXE_rhwp"))
        .args([
            "export-html",
            "samples/equation-lim.hwp",
            "-o",
            out_dir.to_str().expect("utf8 temp dir"),
            "-p",
            "0",
        ])
        .status()
        .expect("run rhwp export-html");
    assert!(status.success(), "export-html should succeed");

    let html_path = out_dir.join("equation-lim.html");
    let html = fs::read_to_string(&html_path)
        .unwrap_or_else(|e| panic!("read {}: {}", html_path.display(), e));
    assert!(
        html.contains("<!doctype html>"),
        "CLI should emit full HTML document"
    );
    assert!(
        html.contains("class=\"hwp-equation\""),
        "CLI HTML should include equations"
    );
    assert!(
        html.contains("data-rhwp-control=\"equation\""),
        "CLI HTML should preserve equation metadata"
    );
}

#[derive(Clone, Copy, Debug)]
struct EquationPath {
    section: usize,
    para: usize,
    control: usize,
    cell: Option<usize>,
    cell_para: Option<usize>,
}

fn first_equation_path(doc: &rhwp::model::document::Document) -> Option<EquationPath> {
    use rhwp::model::control::Control;

    for (section_idx, section) in doc.sections.iter().enumerate() {
        for (para_idx, para) in section.paragraphs.iter().enumerate() {
            for (control_idx, control) in para.controls.iter().enumerate() {
                match control {
                    Control::Equation(_) => {
                        return Some(EquationPath {
                            section: section_idx,
                            para: para_idx,
                            control: control_idx,
                            cell: None,
                            cell_para: None,
                        });
                    }
                    Control::Table(table) => {
                        for (cell_idx, cell) in table.cells.iter().enumerate() {
                            for (cell_para_idx, cell_para) in cell.paragraphs.iter().enumerate() {
                                if cell_para
                                    .controls
                                    .iter()
                                    .any(|c| matches!(c, Control::Equation(_)))
                                {
                                    return Some(EquationPath {
                                        section: section_idx,
                                        para: para_idx,
                                        control: control_idx,
                                        cell: Some(cell_idx),
                                        cell_para: Some(cell_para_idx),
                                    });
                                }
                            }
                        }
                    }
                    _ => {}
                }
            }
        }
    }
    None
}

fn first_equation_style_number(html: &str, key: &str) -> f64 {
    let marker = html
        .find("class=\"hwp-equation\"")
        .unwrap_or_else(|| panic!("missing equation span:\n{html}"));
    let rest = &html[marker..];
    let style_start = rest
        .find("style=\"")
        .unwrap_or_else(|| panic!("missing equation style:\n{html}"))
        + "style=\"".len();
    let style_rest = &rest[style_start..];
    let style_end = style_rest
        .find('"')
        .unwrap_or_else(|| panic!("unterminated equation style:\n{html}"));
    let style = &style_rest[..style_end];
    let key_start = style
        .find(key)
        .unwrap_or_else(|| panic!("missing style key {key} in {style}"))
        + key.len();
    let value = &style[key_start..];
    let value_end = value
        .find("px")
        .unwrap_or_else(|| panic!("missing px value for {key} in {style}"));
    value[..value_end]
        .parse::<f64>()
        .unwrap_or_else(|e| panic!("parse style number {key} from {style}: {e}"))
}

#[test]
fn imported_equation_edit_survives_hwp_export_reload_and_html_positioning() {
    let bytes = fs::read("samples/equation-lim.hwp").expect("read equation sample");
    let mut doc = HwpDocument::from_bytes(&bytes).expect("parse equation sample");
    let path = first_equation_path(doc.document()).expect("sample should contain an equation");

    let edited_script = "A + B";
    let props = format!(
        "{{\"script\":\"{}\",\"fontSize\":1800,\"color\":255}}",
        edited_script
    );
    doc.set_equation_properties_native(
        path.section,
        path.para,
        path.control,
        path.cell,
        path.cell_para,
        &props,
    )
    .expect("edit imported equation");

    let edited_html = doc
        .render_page_html_native(0)
        .expect("render edited equation");
    assert!(
        edited_html.contains("class=\"hwp-equation\"")
            && edited_html.contains("data-rhwp-control=\"equation\""),
        "edited equation should remain editor-addressable in HTML:\n{edited_html}"
    );
    assert!(
        edited_html.contains(">A<") && edited_html.contains(">B<"),
        "edited script should be visible in SVG-backed HTML:\n{edited_html}"
    );
    let edited_left = first_equation_style_number(&edited_html, "left:");
    let edited_top = first_equation_style_number(&edited_html, "top:");
    assert!(
        edited_left.is_finite() && edited_top.is_finite(),
        "edited equation should export with concrete absolute position"
    );

    let exported = doc.export_hwp_native().expect("export edited HWP");
    let reloaded = HwpDocument::from_bytes(&exported).expect("reload edited HWP");
    let props_after = reloaded
        .get_equation_properties_native(
            path.section,
            path.para,
            path.control,
            path.cell,
            path.cell_para,
        )
        .expect("read reloaded equation properties");
    assert!(
        props_after.contains("\"script\":\"A + B\""),
        "edited equation script should survive HWP round-trip: {props_after}"
    );

    let roundtrip_html = reloaded
        .render_page_html_native(0)
        .expect("render reloaded equation");
    assert!(
        roundtrip_html.contains("class=\"hwp-equation\"")
            && roundtrip_html.contains("data-rhwp-control=\"equation\"")
            && roundtrip_html.contains(">A<")
            && roundtrip_html.contains(">B<"),
        "reloaded equation should export back to positioned editable HTML:\n{roundtrip_html}"
    );
    assert_eq!(
        edited_left,
        first_equation_style_number(&roundtrip_html, "left:"),
        "HWP round-trip should preserve equation left position"
    );
    assert_eq!(
        edited_top,
        first_equation_style_number(&roundtrip_html, "top:"),
        "HWP round-trip should preserve equation top position"
    );
}

fn collect_hwp_files(dir: &Path, files: &mut Vec<PathBuf>) {
    let entries =
        fs::read_dir(dir).unwrap_or_else(|e| panic!("read fixture dir {}: {}", dir.display(), e));
    for entry in entries {
        let path = entry.expect("read fixture entry").path();
        if path.is_dir() {
            collect_hwp_files(&path, files);
        } else if matches!(
            path.extension().and_then(|s| s.to_str()),
            Some("hwp") | Some("hwpx")
        ) {
            files.push(path);
        }
    }
}

fn render_page_matching(doc: &HwpDocument, predicate: impl Fn(&str) -> bool) -> Option<String> {
    for page in 0..doc.page_count() {
        if let Ok(html) = doc.render_page_html_native(page) {
            if predicate(&html) {
                return Some(html);
            }
        }
    }
    None
}

#[test]
fn external_math_fixture_equations_edit_export_reload_when_env_set() {
    let fixture_dir = match std::env::var("RHWP_MATH_FIXTURE_DIR") {
        Ok(value) => PathBuf::from(value),
        Err(_) => return,
    };

    let mut files = Vec::new();
    collect_hwp_files(&fixture_dir, &mut files);
    files.sort();
    assert!(
        !files.is_empty(),
        "RHWP_MATH_FIXTURE_DIR should contain recursive HWP/HWPX fixtures: {}",
        fixture_dir.display()
    );

    for file in files {
        let bytes = fs::read(&file).unwrap_or_else(|e| panic!("read {}: {}", file.display(), e));
        let mut doc = HwpDocument::from_bytes(&bytes)
            .unwrap_or_else(|e| panic!("parse {}: {}", file.display(), e));
        let path = first_equation_path(doc.document())
            .unwrap_or_else(|| panic!("no imported equation found in {}", file.display()));
        let props = "{\"script\":\"A + B\"}";
        doc.set_equation_properties_native(
            path.section,
            path.para,
            path.control,
            path.cell,
            path.cell_para,
            props,
        )
        .unwrap_or_else(|e| panic!("edit equation in {}: {}", file.display(), e));

        let edited_html = render_page_matching(&doc, |html| {
            html.contains(">A<") && html.contains(">B<")
        })
        .unwrap_or_else(|| panic!("render edited HTML with edited equation {}", file.display()));
        assert!(
            edited_html.contains("class=\"hwp-equation\"")
                && edited_html.contains("data-rhwp-control=\"equation\""),
            "edited HTML lost equation marker for {}",
            file.display()
        );

        let exported = doc
            .export_hwp_native()
            .unwrap_or_else(|e| panic!("export edited HWP {}: {}", file.display(), e));
        let reloaded = HwpDocument::from_bytes(&exported)
            .unwrap_or_else(|e| panic!("reload edited HWP {}: {}", file.display(), e));
        let props_after = reloaded
            .get_equation_properties_native(
                path.section,
                path.para,
                path.control,
                path.cell,
                path.cell_para,
            )
            .unwrap_or_else(|e| panic!("read reloaded equation props {}: {}", file.display(), e));
        assert!(
            props_after.contains("\"script\":\"A + B\""),
            "edited script did not survive HWP round-trip for {}: {}",
            file.display(),
            props_after
        );

        let roundtrip_html = render_page_matching(&reloaded, |html| {
            html.contains(">A<") && html.contains(">B<")
        })
        .unwrap_or_else(|| panic!("render reloaded HTML with edited equation {}", file.display()));
        assert!(
            roundtrip_html.contains("class=\"hwp-equation\"")
                && roundtrip_html.contains("data-rhwp-control=\"equation\""),
            "reloaded HTML lost positioned equation marker for {}",
            file.display()
        );
    }
}
