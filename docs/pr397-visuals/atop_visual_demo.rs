//! PR #397 시각 검증용 — 실제 HWP 파일을 베이스로 ATOP/OVER 수식 스크립트만 교체하여
//! HWPX로 저장. 이후 `rhwp export-svg`로 풀 파이프라인 SVG 산출.
//!
//! Usage:
//!   cargo run --release --example atop_visual_demo
//!   ./target/release/rhwp.exe export-svg output/svg/pr397-visual/atop.hwpx \
//!       -o output/svg/pr397-visual/

use std::fs;
use std::path::Path;

use rhwp::model::control::Control;
use rhwp::parser::parse_hwp;
use rhwp::serializer::cfb_writer::serialize_hwp;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let base = "samples/equation-lim.hwp";
    let bytes = fs::read(base)?;
    let base_doc = parse_hwp(&bytes)?;
    println!(
        "Base loaded: {} sections, {} paragraphs",
        base_doc.sections.len(),
        base_doc.sections.iter().map(|s| s.paragraphs.len()).sum::<usize>()
    );

    let out_dir = "output/svg/pr397-visual";
    fs::create_dir_all(out_dir)?;

    write_variant(&base_doc, "a atop b", &format!("{out_dir}/atop.hwp"))?;
    write_variant(&base_doc, "a over b", &format!("{out_dir}/over.hwp"))?;
    write_variant(
        &base_doc,
        "{x+y} atop {u-v}",
        &format!("{out_dir}/atop_group.hwp"),
    )?;

    Ok(())
}

fn write_variant(
    base_doc: &rhwp::model::document::Document,
    new_script: &str,
    out_path: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut doc = base_doc.clone();
    let mut replaced = 0;
    for section in &mut doc.sections {
        section.raw_stream = None; // 재직렬화 유도
        for para in &mut section.paragraphs {
            for ctrl in &mut para.controls {
                if let Control::Equation(eq) = ctrl {
                    eq.script = new_script.to_string();
                    eq.raw_ctrl_data = Vec::new();
                    replaced += 1;
                }
            }
        }
    }
    if replaced == 0 {
        return Err(format!("No Equation control found in base doc").into());
    }
    // sanity check
    for s in &doc.sections {
        for p in &s.paragraphs {
            for c in &p.controls {
                if let Control::Equation(eq) = c {
                    println!("  -> equation script in memory: {:?}", eq.script);
                }
            }
        }
    }
    let bytes = serialize_hwp(&doc)?;
    let p = Path::new(out_path);
    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(p, &bytes)?;
    println!(
        "Wrote {} ({} bytes, {} equations replaced with `{}`)",
        p.display(),
        bytes.len(),
        replaced,
        new_script
    );
    Ok(())
}
