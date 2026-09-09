// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileItem {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified_ms: u64,
    pub extension: Option<String>,
    pub is_hidden: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DriveInfo {
    pub name: String,
    pub path: String,
    pub drive_type: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct KnownFolder {
    pub id: String,
    pub name: String,
    pub path: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UserPreferences {
    pub pinned_folders: Vec<String>,
    pub theme: String, // "system" | "dark" | "light"
    pub view_mode: String, // "details" | "grid" | "tiles" | "list"
    pub show_hidden_files: bool,
    pub sort_by: String,
    pub sort_order: String,
    pub last_visited_path: Option<String>,
}

impl Default for UserPreferences {
    fn default() -> Self {
        Self {
            pinned_folders: Vec::new(),
            theme: "system".to_string(),
            view_mode: "details".to_string(),
            show_hidden_files: false,
            sort_by: "name".to_string(),
            sort_order: "asc".to_string(),
            last_visited_path: None,
        }
    }
}

// Get path to user config directory in %APPDATA%\ExplorerApp (separate from Program Files)
fn get_config_dir() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("ExplorerApp")
}

#[tauri::command]
fn get_user_settings() -> Result<UserPreferences, String> {
    let config_dir = get_config_dir();
    let config_path = config_dir.join("settings.json");

    if !config_path.exists() {
        return Ok(UserPreferences::default());
    }

    match fs::read_to_string(&config_path) {
        Ok(content) => serde_json::from_str(&content).map_err(|e| e.to_string()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn save_user_settings(preferences: UserPreferences) -> Result<(), String> {
    let config_dir = get_config_dir();
    if let Err(e) = fs::create_dir_all(&config_dir) {
        return Err(format!("Failed to create config dir: {}", e));
    }

    let config_path = config_dir.join("settings.json");
    let json = serde_json::to_string_pretty(&preferences).map_err(|e| e.to_string())?;

    fs::write(config_path, json).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_drives() -> Vec<DriveInfo> {
    let mut drives = Vec::new();

    #[cfg(target_os = "windows")]
    {
        for letter in b'A'..=b'Z' {
            let drive_str = format!("{}:\\", letter as char);
            let path = Path::new(&drive_str);
            if path.exists() {
                drives.push(DriveInfo {
                    name: format!("Local Disk ({}:)", letter as char),
                    path: drive_str,
                    drive_type: "fixed".to_string(),
                });
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        drives.push(DriveInfo {
            name: "Root Filesystem".to_string(),
            path: "/".to_string(),
            drive_type: "root".to_string(),
        });
    }

    drives
}

#[tauri::command]
fn get_known_folders() -> Vec<KnownFolder> {
    let mut folders = Vec::new();

    if let Some(desktop) = dirs::desktop_dir() {
        if desktop.exists() {
            folders.push(KnownFolder {
                id: "desktop".to_string(),
                name: "Desktop".to_string(),
                path: desktop.to_string_lossy().to_string(),
            });
        }
    }

    if let Some(docs) = dirs::document_dir() {
        if docs.exists() {
            folders.push(KnownFolder {
                id: "documents".to_string(),
                name: "Documents".to_string(),
                path: docs.to_string_lossy().to_string(),
            });
        }
    }

    if let Some(downloads) = dirs::download_dir() {
        if downloads.exists() {
            folders.push(KnownFolder {
                id: "downloads".to_string(),
                name: "Downloads".to_string(),
                path: downloads.to_string_lossy().to_string(),
            });
        }
    }

    if let Some(pictures) = dirs::picture_dir() {
        if pictures.exists() {
            folders.push(KnownFolder {
                id: "pictures".to_string(),
                name: "Pictures".to_string(),
                path: pictures.to_string_lossy().to_string(),
            });
        }
    }

    if let Some(music) = dirs::audio_dir() {
        if music.exists() {
            folders.push(KnownFolder {
                id: "music".to_string(),
                name: "Music".to_string(),
                path: music.to_string_lossy().to_string(),
            });
        }
    }

    if let Some(videos) = dirs::video_dir() {
        if videos.exists() {
            folders.push(KnownFolder {
                id: "videos".to_string(),
                name: "Videos".to_string(),
                path: videos.to_string_lossy().to_string(),
            });
        }
    }

    if let Some(home) = dirs::home_dir() {
        folders.push(KnownFolder {
            id: "home".to_string(),
            name: "Home".to_string(),
            path: home.to_string_lossy().to_string(),
        });
    }

    folders
}

#[tauri::command]
fn read_directory(path: String, show_hidden: bool) -> Result<Vec<FileItem>, String> {
    let dir_path = Path::new(&path);
    if !dir_path.exists() {
        return Err("Directory does not exist".to_string());
    }

    let entries = fs::read_dir(dir_path).map_err(|e| e.to_string())?;
    let mut items = Vec::new();

    for entry_res in entries {
        if let Ok(entry) = entry_res {
            let file_name = entry.file_name().to_string_lossy().to_string();
            let is_hidden = file_name.starts_with('.');

            if !show_hidden && is_hidden {
                continue;
            }

            let file_path = entry.path();
            let metadata = match entry.metadata() {
                Ok(m) => m,
                Err(_) => continue,
            };

            let is_dir = metadata.is_dir();
            let size = if is_dir { 0 } else { metadata.len() };
            let modified_ms = metadata
                .modified()
                .unwrap_or(SystemTime::UNIX_EPOCH)
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64;

            let extension = if is_dir {
                None
            } else {
                file_path
                    .extension()
                    .map(|e| e.to_string_lossy().to_lowercase())
            };

            items.push(FileItem {
                name: file_name,
                path: file_path.to_string_lossy().to_string(),
                is_dir,
                size,
                modified_ms,
                extension,
                is_hidden,
            });
        }
    }

    // Sort folders first, then alphabetically
    items.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(items)
}

#[tauri::command]
fn search_directory(path: String, query: String, max_results: Option<usize>) -> Result<Vec<FileItem>, String> {
    let dir_path = Path::new(&path);
    if !dir_path.exists() {
        return Err("Search directory does not exist".to_string());
    }

    let limit = max_results.unwrap_or(200);
    let mut results = Vec::new();
    let query_lower = query.to_lowercase();

    for entry in walkdir::WalkDir::new(dir_path)
        .max_depth(5)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if results.len() >= limit {
            break;
        }

        let file_name = entry.file_name().to_string_lossy().to_string();
        if file_name.to_lowercase().contains(&query_lower) {
            let metadata = match entry.metadata() {
                Ok(m) => m,
                Err(_) => continue,
            };

            let is_dir = metadata.is_dir();
            let size = if is_dir { 0 } else { metadata.len() };
            let modified_ms = metadata
                .modified()
                .unwrap_or(SystemTime::UNIX_EPOCH)
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64;

            let extension = if is_dir {
                None
            } else {
                entry
                    .path()
                    .extension()
                    .map(|e| e.to_string_lossy().to_lowercase())
            };

            results.push(FileItem {
                name: file_name,
                path: entry.path().to_string_lossy().to_string(),
                is_dir,
                size,
                modified_ms,
                extension,
                is_hidden: entry.file_name().to_string_lossy().starts_with('.'),
            });
        }
    }

    Ok(results)
}

#[tauri::command]
fn create_new_folder(parent_path: String, name: String) -> Result<String, String> {
    let full_path = Path::new(&parent_path).join(&name);
    if full_path.exists() {
        return Err("A folder with that name already exists".to_string());
    }

    fs::create_dir(&full_path).map_err(|e| e.to_string())?;
    Ok(full_path.to_string_lossy().to_string())
}

#[tauri::command]
fn delete_item(path: String) -> Result<(), String> {
    let item_path = Path::new(&path);
    if !item_path.exists() {
        return Err("Item does not exist".to_string());
    }

    if item_path.is_dir() {
        fs::remove_dir_all(item_path).map_err(|e| e.to_string())
    } else {
        fs::remove_file(item_path).map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn rename_item(old_path: String, new_name: String) -> Result<String, String> {
    let current_path = Path::new(&old_path);
    if !current_path.exists() {
        return Err("Item does not exist".to_string());
    }

    let parent = current_path.parent().ok_or("No parent folder found")?;
    let new_path = parent.join(&new_name);

    if new_path.exists() {
        return Err("An item with that name already exists in this folder".to_string());
    }

    fs::rename(current_path, &new_path).map_err(|e| e.to_string())?;
    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
fn open_item(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_user_settings,
            save_user_settings,
            get_drives,
            get_known_folders,
            read_directory,
            search_directory,
            create_new_folder,
            delete_item,
            rename_item,
            open_item,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Explorer App");
}
