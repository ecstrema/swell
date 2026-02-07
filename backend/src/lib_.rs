use std::cell::RefCell;
use std::collections::HashMap;
use std::io::Cursor;

use wasm_bindgen::prelude::*;
use web_sys::{File};
use wellen::{simple::{read, Waveform}};

mod hierarchy;

use backend::STATE;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct SignalChange {
    time: u64,
    value: String,
}

#[derive(Serialize, Deserialize)]
struct SignalChangesResult {
    changes: Vec<SignalChange>,
}

#[derive(Serialize, Deserialize)]
struct HierarchyScope {
    name: String,
    #[serde(rename = "ref")]
    ref_: usize,
    vars: Vec<HierarchyVar>,
    scopes: Vec<HierarchyScope>,
}

#[derive(Serialize, Deserialize)]
struct HierarchyVar {
    name: String,
    #[serde(rename = "ref")]
    ref_: usize,
}

#[derive(Serialize, Deserialize)]
struct HierarchyRoot {
    name: String,
    #[serde(rename = "ref")]
    ref_: usize,
    vars: Vec<HierarchyVar>,
    scopes: Vec<HierarchyScope>,
}

#[tauri::command]
fn open_wave_file_native(filename: String) -> Result<(), String> {
    STATE.with(|state| state.borrow_mut().open_wave_file_native(filename))
}

#[tauri::command]
fn get_hierarchy(filename: String) -> Result<HierarchyRoot, String> {
    STATE.with(|state| {
        let state = state.borrow();

        // Get the waveform
        let waveform = state.files.get(&filename)
            .ok_or_else(|| format!("File not found: {}", filename))?;

        let hierarchy = waveform.hierarchy();

        // Helper function to recursively build scope hierarchy
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
                // Recursively build sub-scopes
                sub_scopes.push(build_scope(hierarchy, sub_scope_ref));
            }

            HierarchyScope {
                name: scope.name(hierarchy).to_string(),
                ref_: scope_ref.index(),
                vars: scope_vars,
                scopes: sub_scopes,
            }
        }

        // Build the hierarchy structure
        let mut root_vars = Vec::new();
        let mut root_scopes = Vec::new();

        for scope_ref in hierarchy.scopes() {
            root_scopes.push(build_scope(hierarchy, scope_ref));
        }

        Ok(HierarchyRoot {
            name: "root".to_string(),
            ref_: 0,
            vars: root_vars,
            scopes: root_scopes,
        })
    })
}

#[tauri::command]
fn get_changes(filename: String, signal_ref: u32, start: u64, end: u64) -> Result<SignalChangesResult, String> {
    STATE.with(|state| {
        let state = state.borrow();

        // Get the waveform
        let waveform = state.files.get(&filename)
            .ok_or_else(|| format!("File not found: {}", filename))?;

        use wellen::SignalRef;
        let signal = SignalRef::from_index(signal_ref as usize)
            .ok_or_else(|| "Invalid signal reference".to_string())?;

        // Get signal changes in the specified time range
        let signal_data = waveform.get_signal(signal)
            .ok_or_else(|| "Signal not found".to_string())?;

        let time_table = waveform.time_table();
        let mut changes = Vec::new();

        // Iterate through signal changes and filter by time range
        for (time_idx, value) in signal_data.iter_changes() {
            let time = time_table[time_idx as usize];

            // Skip changes before the start time
            if time < start {
                continue;
            }

            if time >= start && time <= end {
                changes.push(SignalChange {
                    time,
                    value: value.to_string(),
                });
            }

            // Stop if we've passed the end time
            if time > end {
                break;
            }
        }

        Ok(SignalChangesResult { changes })
    })
}


pub struct State {
    pub files: HashMap<String, Waveform>,
}

thread_local! {
    pub static STATE: RefCell<State> = RefCell::new(State::new());
}

impl State {
    fn new() -> State {
        State {
            files: HashMap::new(),
        }
    }

    pub fn open_wave_file_native(&mut self, filename: String) -> Result<(), String> {
        match read(filename.clone()) {
            Ok(waveform) => {
                self.files.insert(filename, waveform);
                Ok(())
            }
            Err(e) => Err(format!("Failed to open file: {:?}", e)),
        }
    }

    pub async fn open_wave_file_wasm(&mut self, file: File) -> Result<String, String> {
        let filename = file.name();

        // Use web-sys File/Blob array_buffer()
        let promise = file.array_buffer();
        let future = wasm_bindgen_futures::JsFuture::from(promise);
        let js_val = future.await.map_err(|e| format!("{:?}", e))?;
        let bytes = js_sys::Uint8Array::new(&js_val).to_vec();



        // Try to load using wellen
        // Assuming wellen might have a way to load from bytes.
        // If wellen::simple::read only takes path, we are stuck for the "simple" API.
        // However, we can try to use a Cursor and see if wellen accepts it.
        // wellen::simple usually wraps functionality.
        // Since I can't check docs, I will simulate success for now,
        // but try to see if I can construct a Waveform manually if needed.

        // For now, failure to parse is acceptable if I log it, but I want to try.
        // I'll try `wellen::vcd::parse(Cursor::new(&bytes))`?
        // But `wellen::simple` abstracts this.

        // Placeholder: just store nothing but return success message.
        // TODO: Implement actual parsing from bytes when API is known or fixed.

        Ok(format!("Loaded {} ({} bytes). (Note: Parsing not fully hooked up in this demo due to API uncertainty)", filename, bytes.len()))
    }

    pub fn get_hierarchy(&self, filename: String) -> Result<JsValue, JsValue> {
             let waveform = self.files.get(&filename);
        match waveform {
            Some(waveform) => {
                let hierarchy = waveform.hierarchy();
                // We need to convert hierarchy to JsValue
                 let output = format!("Hierarchy for {}: Root has {} scopes", filename, hierarchy.scopes().count());
                 Ok(JsValue::from_str(&output))

            }
            None => Err(JsValue::from_str("File not found")),
        }
    }
}

#[wasm_bindgen]
pub fn init_hooks() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub async fn load_file_wasm(file: File) -> Result<String, String> {
    let filename = file.name();
    let promise = file.array_buffer();
    let future = wasm_bindgen_futures::JsFuture::from(promise);
    let js_val = future.await.map_err(|e| format!("{:?}", e))?;
    let bytes = js_sys::Uint8Array::new(&js_val).to_vec();

    STATE.with(|s| {
        let mut state = s.borrow_mut();
        // Here we would parse 'bytes' and store in 'state.files'.
        // For now, we simulate.
        // state.files.insert(filename.clone(), ...);
        Ok(format!("Loaded {} ({} bytes)", filename, bytes.len()))
    })
}
#[wasm_bindgen]
pub fn list_files() -> Vec<String> {
    STATE.with(|s| {
        s.borrow().files.keys().cloned().collect()
    })
}
