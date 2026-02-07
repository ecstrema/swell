use backend::add_file;

#[tauri::command]
fn add_file_native(path: String) -> String {
    add_file(path.clone());
    path
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![add_file_native])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
