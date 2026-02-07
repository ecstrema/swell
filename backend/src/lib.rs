use std::sync::Mutex;
use wasm_bindgen::prelude::*;
use web_sys::File;

// We need a thread-safe global state for the Tauri side (multi-threaded).
// For Wasm (single-threaded usually), Mutex is still fine or we could use RefCell/thread_local.
// Since we want to share code, we'll use a static Mutex.
// Note: In a real Wasm environment without threads, Mutex might be stubbed or work as a plain lock.

static OPENED_FILES: Mutex<Vec<String>> = Mutex::new(Vec::new());

pub fn add_file(path: String) {
    let mut files = OPENED_FILES.lock().unwrap();
    files.push(path.clone());
}

#[wasm_bindgen]
pub fn add_file_wasm(file: File) -> String {
    let name = file.name();
    add_file(name.clone());
    name
}
