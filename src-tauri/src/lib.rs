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
        
        // Build the hierarchy structure
        let mut root_vars = Vec::new();
        let mut root_scopes = Vec::new();
        
        for scope_ref in hierarchy.scopes() {
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
                let sub_scope = &hierarchy[sub_scope_ref];
                // For now, we'll create a simplified structure for sub-scopes
                sub_scopes.push(HierarchyScope {
                    name: sub_scope.name(hierarchy).to_string(),
                    ref_: sub_scope_ref.index(),
                    vars: Vec::new(), // We could recursively populate this
                    scopes: Vec::new(),
                });
            }
            
            root_scopes.push(HierarchyScope {
                name: scope.name(hierarchy).to_string(),
                ref_: scope_ref.index(),
                vars: scope_vars,
                scopes: sub_scopes,
            });
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
