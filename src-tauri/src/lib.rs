use backend::add_file;
use backend::{
    get_files as backend_get_files, get_hierarchy as backend_get_hierarchy,
    get_signal_changes as backend_get_signal_changes, remove_file as backend_remove_file,
};
use backend::{HierarchyRoot, SignalChange};
use tauri::Manager;

const STORE_FILENAME: &str = "opened-files.json";

fn save_opened_files(app_handle: &tauri::AppHandle) {
    let files = backend_get_files();
    
    if let Some(app_dir) = app_handle.path().app_data_dir().ok() {
        if let Err(e) = std::fs::create_dir_all(&app_dir) {
            eprintln!("Failed to create app data directory: {}", e);
            return;
        }
        
        let store_path = app_dir.join(STORE_FILENAME);
        if let Ok(json) = serde_json::to_string(&files) {
            if let Err(e) = std::fs::write(&store_path, json) {
                eprintln!("Failed to save opened files: {}", e);
            }
        }
    }
}

fn load_opened_files(app_handle: &tauri::AppHandle) {
    if let Some(app_dir) = app_handle.path().app_data_dir().ok() {
        let store_path = app_dir.join(STORE_FILENAME);
        
        if let Ok(contents) = std::fs::read_to_string(&store_path) {
            if let Ok(files) = serde_json::from_str::<Vec<String>>(&contents) {
                for path in files {
                    if let Ok(wave) = wellen::simple::read(&path) {
                        add_file(path.clone(), wave);
                    }
                }
            }
        }
    }
}

#[tauri::command]
fn get_files() -> Vec<String> {
    backend_get_files()
}

#[tauri::command]
fn remove_file(path: String, app_handle: tauri::AppHandle) {
    backend_remove_file(path.clone());
    save_opened_files(&app_handle);
}

#[tauri::command]
fn get_hierarchy(filename: String) -> Result<HierarchyRoot, String> {
    backend_get_hierarchy(filename)
}

#[tauri::command]
fn get_signal_changes(
    filename: String,
    signal_id: usize,
    start: u64,
    end: u64,
) -> Result<Vec<SignalChange>, String> {
    backend_get_signal_changes(filename, signal_id, start, end)
}

#[tauri::command]
fn add_file_command(path: String, app_handle: tauri::AppHandle) -> Result<String, String> {
    let wave = wellen::simple::read(&path).map_err(|e| e.to_string())?;

    add_file(path.clone(), wave);
    save_opened_files(&app_handle);

    let filename = std::path::Path::new(&path)
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or(&path)
        .to_string();

    Ok(filename)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            load_opened_files(&app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            add_file_command,
            get_files,
            remove_file,
            get_hierarchy,
            get_signal_changes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
