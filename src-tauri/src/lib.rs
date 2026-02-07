use backend::add_file;
use backend::{
    get_files as backend_get_files, get_hierarchy as backend_get_hierarchy,
    get_signal_changes as backend_get_signal_changes, remove_file as backend_remove_file,
};
use backend::{HierarchyRoot, SignalChange};

#[tauri::command]
fn get_files() -> Vec<String> {
    backend_get_files()
}

#[tauri::command]
fn remove_file(path: String) {
    backend_remove_file(path)
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
fn add_file_command(path: String) -> Result<String, String> {
    let wave = wellen::simple::read(&path).map_err(|e| e.to_string())?;

    add_file(path.clone(), wave);

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
