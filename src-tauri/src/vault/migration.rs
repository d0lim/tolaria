use std::fs;
use std::path::Path;
use walkdir::WalkDir;

fn has_legacy_is_a(fm_content: &str) -> bool {
    fm_content.lines().any(|line| {
        let t = line.trim_start();
        t.starts_with("is_a:")
            || t.starts_with("\"Is A\":")
            || t.starts_with("'Is A':")
            || t.starts_with("Is A:")
    })
}

/// Extract the value from a legacy `is_a` / `Is A` line.
fn extract_is_a_value(line: &str) -> Option<&str> {
    let t = line.trim_start();
    for prefix in &["is_a:", "\"Is A\":", "'Is A':", "Is A:"] {
        if let Some(rest) = t.strip_prefix(prefix) {
            let v = rest.trim();
            return Some(v);
        }
    }
    None
}

/// Migrate a single file's frontmatter from `is_a`/`Is A` to `type`.
/// Returns Ok(true) if the file was modified, Ok(false) if no migration needed.
fn migrate_file_is_a_to_type(path: &Path) -> Result<bool, String> {
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;

    if !content.starts_with("---\n") {
        return Ok(false);
    }
    let fm_end = match content[4..].find("\n---") {
        Some(i) => i + 4,
        None => return Ok(false),
    };
    let fm_content = &content[4..fm_end];

    if !has_legacy_is_a(fm_content) {
        return Ok(false);
    }

    // Check if `type:` already exists
    let has_type = fm_content.lines().any(|line| {
        let t = line.trim_start();
        t.starts_with("type:")
    });

    let mut new_lines: Vec<String> = Vec::new();
    let mut is_a_value: Option<String> = None;

    for line in fm_content.lines() {
        if let Some(val) = extract_is_a_value(line) {
            is_a_value = Some(val.to_string());
            // Skip list continuations after is_a
            continue;
        }
        new_lines.push(line.to_string());
    }

    // If type: doesn't exist and we found an is_a value, add type:
    if !has_type {
        if let Some(ref val) = is_a_value {
            // Insert type: at the beginning (after other keys is fine too, but beginning is clean)
            new_lines.insert(0, format!("type: {}", val));
        }
    }

    let rest = &content[fm_end + 4..];
    let new_content = format!("---\n{}\n---{}", new_lines.join("\n"), rest);

    fs::write(path, &new_content)
        .map_err(|e| format!("Failed to write {}: {}", path.display(), e))?;

    Ok(true)
}

/// Migrate all markdown files in the vault from `is_a`/`Is A` to `type`.
/// Returns the number of files migrated.
pub fn migrate_is_a_to_type(vault_path: &str) -> Result<usize, String> {
    let vault = Path::new(vault_path);
    if !vault.exists() || !vault.is_dir() {
        return Err(format!(
            "Vault path does not exist or is not a directory: {}",
            vault_path
        ));
    }

    let mut migrated = 0;
    for entry in WalkDir::new(vault)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if !path.is_file() || path.extension().map(|ext| ext != "md").unwrap_or(true) {
            continue;
        }

        match migrate_file_is_a_to_type(path) {
            Ok(true) => {
                log::info!("Migrated is_a → type: {}", path.display());
                migrated += 1;
            }
            Ok(false) => {}
            Err(e) => {
                log::warn!("Failed to migrate {}: {}", path.display(), e);
            }
        }
    }

    Ok(migrated)
}
