use std::collections::HashMap;
use std::sync::{LazyLock, Mutex};

use wasm_bindgen::prelude::*;
use wellen::simple::{read, Waveform};

struct State {
    files: HashMap<String, Waveform>,
}

static STATE: LazyLock<Mutex<State>> = LazyLock::new(|| Mutex::new(State::new()));

impl State {
    fn new() -> State {
        State { files: HashMap::new() }
    }

    fn open_wave_file(&mut self, filename: String) -> Result<(), String> {
        match read(filename.clone()) {
            Ok(waveform) => {
                self.files.insert(filename, waveform);
                Ok(())
            }
            Err(e) => {
                Err(format!("Failed to open file: {:?}", e))
            }
        }
    }
}

#[wasm_bindgen]
#[tauri::command]
pub fn open_wave_file(filename: String) -> Result<(), String> {
    match STATE.lock() {
        Ok(mut state) => state.open_wave_file(filename),
        Err(_) => Err("Failed to lock state".into()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![open_wave_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
