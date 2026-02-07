use std::sync::Mutex;
use wasm_bindgen::prelude::*;
use wellen;

// We need a thread-safe global state for the Tauri side (multi-threaded).
// For Wasm (single-threaded usually), Mutex is still fine or we could use RefCell/thread_local.
// Since we want to share code, we'll use a static Mutex.
// Note: In a real Wasm environment without threads, Mutex might be stubbed or work as a plain lock.

pub struct LoadedWave {
    pub path: String,
    pub wave: wellen::simple::Waveform,
}

static OPENED_FILES: Mutex<Vec<LoadedWave>> = Mutex::new(Vec::new());

pub fn add_file(path: String, waveform: wellen::simple::Waveform) {
    let mut files = OPENED_FILES.lock().unwrap();

    files.push(LoadedWave {
        path,
        wave: waveform,
    });
}

#[wasm_bindgen]
pub fn add_file_bytes(name: String, content: Vec<u8>) -> Result<String, String> {
    let cursor = std::io::Cursor::new(content);
    let waveform = wellen::simple::read_from_reader(cursor).map_err(|e| e.to_string())?;

    add_file(name.clone(), waveform);
    Ok(name)
}
