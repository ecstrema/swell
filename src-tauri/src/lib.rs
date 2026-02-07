
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            open_wave_file_native,
            get_hierarchy,
            get_changes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
