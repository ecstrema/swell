use std::sync::Mutex;
use wasm_bindgen::prelude::*;
use wellen;
use serde::{Serialize, Deserialize};

// We need a thread-safe global state for the Tauri side (multi-threaded).
// For Wasm (single-threaded usually), Mutex is still fine or we could use RefCell/thread_local.
// Since we want to share code, we'll use a static Mutex.
// Note: In a real Wasm environment without threads, Mutex might be stubbed or work as a plain lock.

#[derive(Serialize, Deserialize)]
pub struct SignalChange {
    time: u64,
    value: String,
}

#[derive(Serialize, Deserialize)]
pub struct HierarchyScope {
    name: String,
    #[serde(rename = "ref")]
    ref_: usize,
    vars: Vec<HierarchyVar>,
    scopes: Vec<HierarchyScope>,
}

#[derive(Serialize, Deserialize)]
pub struct HierarchyVar {
    name: String,
    #[serde(rename = "ref")]
    ref_: usize,
}

#[derive(Serialize, Deserialize)]
pub struct HierarchyRoot {
    name: String,
    #[serde(rename = "ref")]
    ref_: usize,
    vars: Vec<HierarchyVar>,
    scopes: Vec<HierarchyScope>,
}

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
pub fn get_files() -> Vec<String> {
    let files = OPENED_FILES.lock().unwrap();
    files.iter().map(|f| f.path.clone()).collect()
}

#[wasm_bindgen]
pub fn remove_file(path: String) {
    let mut files = OPENED_FILES.lock().unwrap();
    if let Some(pos) = files.iter().position(|x| x.path == path) {
        files.remove(pos);
    }
}

#[wasm_bindgen]
pub fn add_file_bytes(name: String, content: Vec<u8>) -> Result<String, String> {
    let cursor = std::io::Cursor::new(content);
    let waveform = wellen::simple::read_from_reader(cursor).map_err(|e| e.to_string())?;

    add_file(name.clone(), waveform);
    Ok(name)
}

fn build_scope(hierarchy: &wellen::Hierarchy, scope_ref: wellen::ScopeRef) -> HierarchyScope {
    let scope = &hierarchy[scope_ref];

    let mut scope_vars = Vec::new();
    for var_ref in scope.vars(hierarchy) {
        let var = &hierarchy[var_ref];
        scope_vars.push(HierarchyVar {
            name: var.name(hierarchy).to_string(),
            ref_: var_ref.index(),
        });
    }

    let mut sub_scopes = Vec::new();
    for sub_scope_ref in scope.scopes(hierarchy) {
        sub_scopes.push(build_scope(hierarchy, sub_scope_ref));
    }

    HierarchyScope {
        name: scope.name(hierarchy).to_string(),
        ref_: scope_ref.index(),
        vars: scope_vars,
        scopes: sub_scopes,
    }
}

pub fn get_hierarchy(filename: String) -> Result<HierarchyRoot, String> {
    let files = OPENED_FILES.lock().unwrap();
    let file = files.iter().find(|f| f.path.ends_with(&filename) || f.path == filename)
        .ok_or_else(|| format!("File not found: {}", filename))?;

    let waveform = &file.wave;
    let hierarchy = waveform.hierarchy();

    let root_vars = Vec::new(); // Usually empty for root/global
    let mut root_scopes = Vec::new();

    for scope_ref in hierarchy.scopes() {
        root_scopes.push(build_scope(hierarchy, scope_ref));
    }

    // Creating a synthetic "root" to hold everything
    Ok(HierarchyRoot {
        name: "root".to_string(),
        ref_: 0, // Placeholder
        vars: root_vars,
        scopes: root_scopes,
    })
}

#[wasm_bindgen]
pub fn get_hierarchy_wasm(filename: String) -> Result<JsValue, String> {
    let root = get_hierarchy(filename)?;
    serde_wasm_bindgen::to_value(&root).map_err(|e| e.to_string())
}

use wellen::SignalRef;

pub fn get_signal_changes(filename: String, signal_id: usize, start: u64, end: u64) -> Result<Vec<SignalChange>, String> {
    let files = OPENED_FILES.lock().unwrap();
    let file = files.iter().find(|f| f.path.ends_with(&filename) || f.path == filename)
        .ok_or_else(|| format!("File not found: {}", filename))?;

    let waveform = &file.wave;

    // In wellen 0.14, SignalRef::from_index might not be public or existing.
    // Usually we construct it or cast.
    // If SignalRef(usize), we just use it.
    // Let's assume we can cast or construct.
    // Actually wellen::SignalRef is a generational index often.
    // But let's check lib_.rs usage: SignalRef::from_index(signal_ref as usize)

    // If that fails to compile, we will fix.
    let signal_ref = SignalRef::from_index(signal_id).ok_or("Invalid signal ID")?;

    let signal = waveform.get_signal(signal_ref).ok_or("Signal not found")?;
    let time_table = waveform.time_table();

    let mut changes = Vec::new();

    for (time_idx, value) in signal.iter_changes() {
         let time = time_table[time_idx as usize];

         if time < start { continue; }
         if time > end { break; }

         changes.push(SignalChange {
             time,
             value: format!("{}", value),
         });
    }

    Ok(changes)
}

#[wasm_bindgen]
pub fn get_signal_changes_wasm(filename: String, signal_id: usize, start: u64, end: u64) -> Result<JsValue, String> {
    let changes = get_signal_changes(filename, signal_id, start, end)?;
    serde_wasm_bindgen::to_value(&changes).map_err(|e| e.to_string())
}
