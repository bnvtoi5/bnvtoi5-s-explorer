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

// Get path to user config directory in %APPDATA%\ExplorerApp (separate from Program Files)
fn get_config_dir() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("ExplorerApp")
}

#[tauri::command]
fn get_user_settings() -> Result<serde_json::Value, String> {
    let config_dir = get_config_dir();
    let config_path = config_dir.join("settings.json");

    if !config_path.exists() {
        return Ok(serde_json::json!({
            "pinnedFolders": [],
            "theme": "system",
            "viewMode": "details",
            "showHiddenFiles": false,
            "sortBy": "name",
            "sortOrder": "asc",
            "lastVisitedPath": null,
            "smartZones": [],
            "folderSmartZones": {}
        }));
    }

    match fs::read_to_string(&config_path) {
        Ok(content) => serde_json::from_str(&content).map_err(|e| e.to_string()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn save_user_settings(preferences: serde_json::Value) -> Result<(), String> {
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
        // Try opening file or directory with Windows default handler
        let status = std::process::Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn();

        if status.is_err() {
            std::process::Command::new("explorer")
                .arg(&path)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
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

#[tauri::command]
fn open_in_terminal(dir_path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let mut clean_path = dir_path.trim_end_matches(['\\', '/']).to_string();
        if clean_path.ends_with(':') {
            clean_path.push('\\');
        }
        // Use cmd.exe /C start with /D flag and cd /d to guarantee the console window opens exactly at dir_path
        let mut cmd = std::process::Command::new("cmd.exe");
        if std::path::Path::new(&clean_path).exists() {
            cmd.current_dir(&clean_path);
        }
        cmd.args(["/C", "start", "Command Prompt", "/D", &clean_path, "cmd.exe", "/K", &format!("cd /d \"{}\"", clean_path)])
            .spawn()
            .map_err(|e| format!("Failed to launch CMD: {}", e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        let mut cmd = std::process::Command::new("sh");
        if std::path::Path::new(&dir_path).exists() {
            cmd.current_dir(&dir_path);
        }
        cmd.arg("-c")
            .arg(&format!("cd '{}' && $SHELL", dir_path))
            .spawn()
            .map_err(|e| format!("Failed to launch terminal: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
fn open_in_powershell(dir_path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let mut clean_path = dir_path.trim_end_matches(['\\', '/']).to_string();
        if clean_path.ends_with(':') {
            clean_path.push('\\');
        }
        let mut cmd = std::process::Command::new("cmd.exe");
        if std::path::Path::new(&clean_path).exists() {
            cmd.current_dir(&clean_path);
        }
        cmd.args(["/C", "start", "PowerShell", "/D", &clean_path, "powershell.exe", "-NoExit", "-Command", &format!("Set-Location -LiteralPath '{}'", clean_path)])
            .spawn()
            .map_err(|e| format!("Failed to launch PowerShell: {}", e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = dir_path;
    }

    Ok(())
}

#[tauri::command]
fn open_with_code(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd.exe")
            .args(["/C", "code", &path])
            .spawn()
            .map_err(|e| format!("Failed to launch VS Code: {}", e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("code")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to launch VS Code: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
fn run_as_admin(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let ps_cmd = format!("Start-Process -FilePath '{}' -Verb RunAs", path.replace("'", "''"));
        std::process::Command::new("powershell.exe")
            .args(["-NoProfile", "-Command", &ps_cmd])
            .spawn()
            .map_err(|e| format!("Failed to run as admin: {}", e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = path;
    }

    Ok(())
}

#[tauri::command]
fn extract_archive(archive_path: String, destination_folder: Option<String>) -> Result<String, String> {
    let arch_file = Path::new(&archive_path);
    if !arch_file.exists() {
        return Err("Archive file does not exist".to_string());
    }

    let target_dir = match destination_folder {
        Some(dest) => PathBuf::from(dest),
        None => {
            let parent = arch_file.parent().unwrap_or_else(|| Path::new("."));
            let stem = arch_file.file_stem().unwrap_or_default().to_string_lossy();
            parent.join(stem.to_string())
        }
    };

    if !target_dir.exists() {
        fs::create_dir_all(&target_dir).map_err(|e| format!("Cannot create target folder: {}", e))?;
    }

    let target_str = target_dir.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    {
        // 1. Try Windows built-in tar.exe which natively extracts .zip, .7z, .tar, .gz, and .rar
        let tar_status = std::process::Command::new("tar.exe")
            .args(["-xf", &archive_path, "-C", &target_str])
            .status();

        if let Ok(st) = tar_status {
            if st.success() {
                return Ok(target_str);
            }
        }

        // 2. Fallback: PowerShell Expand-Archive for standard zip
        let ps_cmd = format!(
            "Expand-Archive -LiteralPath '{}' -DestinationPath '{}' -Force",
            archive_path.replace("'", "''"),
            target_str.replace("'", "''")
        );
        let ps_status = std::process::Command::new("powershell.exe")
            .args(["-NoProfile", "-Command", &ps_cmd])
            .status();

        if let Ok(st) = ps_status {
            if st.success() {
                return Ok(target_str);
            }
        }

        // 3. Fallback: If 7-Zip (7z.exe) is installed in standard locations
        let seven_zip_paths = [
            r"C:\Program Files\7-Zip\7z.exe",
            r"C:\Program Files (x86)\7-Zip\7z.exe",
        ];
        for sz in seven_zip_paths {
            if Path::new(sz).exists() {
                let sz_status = std::process::Command::new(sz)
                    .args(["x", &archive_path, &format!("-o{}", target_str), "-y"])
                    .status();
                if let Ok(st) = sz_status {
                    if st.success() {
                        return Ok(target_str);
                    }
                }
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let tar_status = std::process::Command::new("tar")
            .args(["-xf", &archive_path, "-C", &target_str])
            .status();
        if let Ok(st) = tar_status {
            if st.success() {
                return Ok(target_str);
            }
        }
    }

    Ok(target_str)
}

#[tauri::command]
fn create_template_file(dir_path: String, file_name: String, content: Option<String>) -> Result<String, String> {
    let full_path = Path::new(&dir_path).join(&file_name);
    if full_path.exists() {
        return Err("A file with that name already exists".to_string());
    }

    let initial_content = content.unwrap_or_default();
    fs::write(&full_path, initial_content).map_err(|e| format!("Failed to create file: {}", e))?;
    Ok(full_path.to_string_lossy().to_string())
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    if !dst.exists() {
        fs::create_dir_all(dst)?;
    }
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let entry_path = entry.path();
        let target_child = dst.join(entry.file_name());
        if entry_path.is_dir() {
            copy_dir_recursive(&entry_path, &target_child)?;
        } else {
            fs::copy(&entry_path, &target_child)?;
        }
    }
    Ok(())
}

#[tauri::command]
fn move_or_copy_items(
    source_paths: Vec<String>,
    destination_dir: String,
    is_copy: bool,
) -> Result<Vec<FileItem>, String> {
    let dest_dir = Path::new(&destination_dir);
    if !dest_dir.exists() {
        return Err("Destination folder does not exist".to_string());
    }

    let mut result_items = Vec::new();

    for src_str in source_paths {
        let src_path = Path::new(&src_str);
        if !src_path.exists() {
            continue;
        }

        let file_name = match src_path.file_name() {
            Some(n) => n.to_string_lossy().to_string(),
            None => continue,
        };

        let is_dir = src_path.is_dir();
        let src_parent = src_path.parent();
        let is_same_folder = src_parent.map_or(false, |p| p == dest_dir);

        let target_file_name = if is_copy {
            let (stem, ext) = if is_dir {
                (file_name.clone(), "".to_string())
            } else {
                let dot_idx = file_name.rfind('.');
                match dot_idx {
                    Some(idx) => (file_name[..idx].to_string(), file_name[idx..].to_string()),
                    None => (file_name.clone(), "".to_string()),
                }
            };

            if is_same_folder {
                let mut candidate = format!("{} - Copy{}", stem, ext);
                let mut counter = 2;
                while dest_dir.join(&candidate).exists() {
                    candidate = format!("{} - Copy ({}){}", stem, counter, ext);
                    counter += 1;
                }
                candidate
            } else {
                let mut candidate = file_name.clone();
                let mut counter = 2;
                while dest_dir.join(&candidate).exists() {
                    candidate = format!("{} - Copy ({}){}", stem, counter, ext);
                    counter += 1;
                }
                candidate
            }
        } else {
            if is_same_folder {
                continue;
            }
            let mut candidate = file_name.clone();
            let (stem, ext) = if is_dir {
                (file_name.clone(), "".to_string())
            } else {
                let dot_idx = file_name.rfind('.');
                match dot_idx {
                    Some(idx) => (file_name[..idx].to_string(), file_name[idx..].to_string()),
                    None => (file_name.clone(), "".to_string()),
                }
            };
            let mut counter = 2;
            while dest_dir.join(&candidate).exists() {
                candidate = format!("{} ({}){}", stem, counter, ext);
                counter += 1;
            }
            candidate
        };

        let target_path = dest_dir.join(&target_file_name);

        if is_copy {
            if is_dir {
                copy_dir_recursive(src_path, &target_path).map_err(|e| e.to_string())?;
            } else {
                fs::copy(src_path, &target_path).map_err(|e| e.to_string())?;
            }
        } else {
            // Cut: try fast filesystem atomic rename first
            if fs::rename(src_path, &target_path).is_err() {
                // Fallback for cross-drive / cross-partition moves
                if is_dir {
                    copy_dir_recursive(src_path, &target_path).map_err(|e| e.to_string())?;
                    let _ = fs::remove_dir_all(src_path);
                } else {
                    fs::copy(src_path, &target_path).map_err(|e| e.to_string())?;
                    let _ = fs::remove_file(src_path);
                }
            }
        }

        let metadata = target_path.metadata().ok();
        let size = metadata.as_ref().map_or(0, |m| if is_dir { 0 } else { m.len() });
        let modified_ms = metadata
            .as_ref()
            .and_then(|m| m.modified().ok())
            .unwrap_or(SystemTime::UNIX_EPOCH)
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        let extension = if is_dir {
            None
        } else {
            target_path.extension().map(|e| e.to_string_lossy().to_lowercase())
        };

        result_items.push(FileItem {
            name: target_file_name,
            path: target_path.to_string_lossy().to_string(),
            is_dir,
            size,
            modified_ms,
            extension,
            is_hidden: false,
        });
    }

    Ok(result_items)
}

fn main() {
    #[cfg(target_os = "windows")]
    {
        // Reduce Chromium WebView2 memory footprint closer to native Explorer (~60-75MB)
        std::env::set_var(
            "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
            "--disable-features=Translate,OptimizationHints,MediaRouter --disable-background-timer-throttling --js-flags=\"--max-old-space-size=128\""
        );
    }

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
            open_in_terminal,
            open_in_powershell,
            open_with_code,
            run_as_admin,
            extract_archive,
            create_template_file,
            move_or_copy_items,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Explorer App");
}
