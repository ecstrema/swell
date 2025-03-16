use backend::STATE;

#[tauri::command]
fn open_wave_file_native(filename: String) -> Result<(), String> {
    STATE.with(|state| state.borrow_mut().open_wave_file_native(filename))
}

#[cfg_attr(mobile, tauri::mobile_entry_poeint)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![open_wave_file_native])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
