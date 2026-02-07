use backend::add_file;

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
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![add_file_command])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
