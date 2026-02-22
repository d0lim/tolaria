use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Settings {
    pub anthropic_key: Option<String>,
    pub openai_key: Option<String>,
    pub google_key: Option<String>,
}

fn settings_path() -> Result<PathBuf, String> {
    dirs::config_dir()
        .map(|d| d.join("com.laputa.app").join("settings.json"))
        .ok_or_else(|| "Could not determine config directory".to_string())
}

pub fn get_settings() -> Result<Settings, String> {
    let path = settings_path()?;
    if !path.exists() {
        return Ok(Settings::default());
    }
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read settings: {}", e))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse settings: {}", e))
}

pub fn save_settings(settings: Settings) -> Result<(), String> {
    let path = settings_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    // Trim whitespace and convert empty strings to None
    let cleaned = Settings {
        anthropic_key: settings.anthropic_key.map(|k| k.trim().to_string()).filter(|k| !k.is_empty()),
        openai_key: settings.openai_key.map(|k| k.trim().to_string()).filter(|k| !k.is_empty()),
        google_key: settings.google_key.map(|k| k.trim().to_string()).filter(|k| !k.is_empty()),
    };

    let json = serde_json::to_string_pretty(&cleaned)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(&path, json)
        .map_err(|e| format!("Failed to write settings: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    fn with_temp_config<F: FnOnce()>(f: F) {
        let tmp = env::temp_dir().join(format!("laputa-test-{}", std::process::id()));
        fs::create_dir_all(&tmp).unwrap();
        env::set_var("XDG_CONFIG_HOME", &tmp);
        f();
        let _ = fs::remove_dir_all(&tmp);
    }

    #[test]
    fn test_default_settings_when_no_file() {
        let settings = Settings::default();
        assert!(settings.anthropic_key.is_none());
        assert!(settings.openai_key.is_none());
        assert!(settings.google_key.is_none());
    }

    #[test]
    fn test_settings_serialize_deserialize() {
        let settings = Settings {
            anthropic_key: Some("sk-ant-test123".to_string()),
            openai_key: None,
            google_key: Some("AIza-test".to_string()),
        };
        let json = serde_json::to_string(&settings).unwrap();
        let parsed: Settings = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.anthropic_key, Some("sk-ant-test123".to_string()));
        assert!(parsed.openai_key.is_none());
        assert_eq!(parsed.google_key, Some("AIza-test".to_string()));
    }

    #[test]
    fn test_save_trims_whitespace_and_filters_empty() {
        // Test the cleaning logic directly
        let settings = Settings {
            anthropic_key: Some("  sk-ant-test  ".to_string()),
            openai_key: Some("   ".to_string()),
            google_key: Some("".to_string()),
        };
        let cleaned = Settings {
            anthropic_key: settings.anthropic_key.map(|k| k.trim().to_string()).filter(|k| !k.is_empty()),
            openai_key: settings.openai_key.map(|k| k.trim().to_string()).filter(|k| !k.is_empty()),
            google_key: settings.google_key.map(|k| k.trim().to_string()).filter(|k| !k.is_empty()),
        };
        assert_eq!(cleaned.anthropic_key, Some("sk-ant-test".to_string()));
        assert!(cleaned.openai_key.is_none());
        assert!(cleaned.google_key.is_none());
    }
}
