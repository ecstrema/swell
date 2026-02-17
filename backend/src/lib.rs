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
            ref_: var.signal_ref().index(),
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

#[cfg(test)]
mod tests {
    use super::*;
    use serial_test::serial;

    #[test]
    #[serial]
    fn test_file_management() {
        // Clear files first (since it's a global static)
        {
            let mut files = OPENED_FILES.lock().unwrap();
            files.clear();
        }

        // Initially empty
        assert_eq!(get_files().len(), 0);

        // Use a real VCD file to ensure reliable parsing
        let vcd_content = std::fs::read("../examples/simple.vcd").expect("Failed to read simple.vcd");
        let res = add_file_bytes("test.vcd".to_string(), vcd_content);
        assert!(res.is_ok(), "Failed to add file");

        assert_eq!(get_files().len(), 1);
        assert_eq!(get_files()[0], "test.vcd");

        remove_file("test.vcd".to_string());
        assert_eq!(get_files().len(), 0);
    }

    #[test]
    #[serial]
    fn test_signal_changes_with_real_file() {
        // Clear files first
        {
            let mut files = OPENED_FILES.lock().unwrap();
            files.clear();
        }

        // Load a real VCD file from examples
        let vcd_content = std::fs::read("../examples/simple.vcd").expect("Failed to read simple.vcd");
        let res = add_file_bytes("simple.vcd".to_string(), vcd_content);
        assert!(res.is_ok(), "Failed to load VCD file");

        // Get hierarchy to find signal refs
        let hierarchy = get_hierarchy("simple.vcd".to_string()).expect("Failed to get hierarchy");
        
        // Find the first variable with a signal
        let mut test_signal_ref: Option<usize> = None;
        for scope in &hierarchy.scopes {
            if !scope.vars.is_empty() {
                test_signal_ref = Some(scope.vars[0].ref_);
                break;
            }
        }

        assert!(test_signal_ref.is_some(), "No variables found in hierarchy");
        let signal_ref = test_signal_ref.unwrap();

        // Try to get signal changes - this should work with proper signal reference
        let result = get_signal_changes("simple.vcd".to_string(), signal_ref, 0, 1000);
        assert!(result.is_ok(), "Failed to get signal changes: {:?}", result.err());
        
        let changes = result.unwrap();
        assert!(changes.len() > 0, "Expected at least one signal change");

        // Cleanup
        remove_file("simple.vcd".to_string());
    }

    #[test]
    #[serial]
    fn test_signal_changes_includes_boundary_values() {
        // Clear files first
        {
            let mut files = OPENED_FILES.lock().unwrap();
            files.clear();
        }

        // Load a real VCD file from examples
        let vcd_content = std::fs::read("../examples/simple.vcd").expect("Failed to read simple.vcd");
        let res = add_file_bytes("simple.vcd".to_string(), vcd_content);
        assert!(res.is_ok(), "Failed to load VCD file");

        // Get hierarchy to find signal refs
        let hierarchy = get_hierarchy("simple.vcd".to_string()).expect("Failed to get hierarchy");
        
        // Find a variable with multiple changes (clk is a good candidate)
        let mut test_signal_ref: Option<usize> = None;
        for scope in &hierarchy.scopes {
            for var in &scope.vars {
                if var.name == "clk" {
                    test_signal_ref = Some(var.ref_);
                    break;
                }
            }
            if test_signal_ref.is_some() {
                break;
            }
        }

        assert!(test_signal_ref.is_some(), "No 'clk' variable found in hierarchy");
        let signal_ref = test_signal_ref.unwrap();

        // First, get all changes to understand the signal
        let all_changes = get_signal_changes("simple.vcd".to_string(), signal_ref, 0, u64::MAX)
            .expect("Failed to get all signal changes");
        
        assert!(all_changes.len() >= 4, "Expected at least 4 changes for clk signal");

        // Now test with a range that excludes the first and last changes
        // Choose a range like [30, 100] which should be in the middle
        let range_start = 30;
        let range_end = 100;

        let range_changes = get_signal_changes("simple.vcd".to_string(), signal_ref, range_start, range_end)
            .expect("Failed to get range signal changes");

        // Verify that the first returned change is before the range start
        assert!(
            range_changes.len() > 0,
            "Expected at least one change in result"
        );
        
        // The first change should be before or at the start (it's the boundary change)
        assert!(
            range_changes[0].time <= range_start,
            "First change should be at or before range start. Got time={}, expected <= {}",
            range_changes[0].time,
            range_start
        );

        // At least one change should be within the range
        let has_change_in_range = range_changes.iter().any(|c| c.time >= range_start && c.time <= range_end);
        assert!(has_change_in_range, "Expected at least one change within the range");

        // The last change should be after the range end (if there are changes after end)
        // Find if there's a change after end in all_changes
        let has_change_after_end = all_changes.iter().any(|c| c.time > range_end);
        if has_change_after_end {
            // Then our result should include it as the last element
            assert!(
                range_changes.last().unwrap().time > range_end,
                "Last change should be after range end when such a change exists. Got time={}, expected > {}",
                range_changes.last().unwrap().time,
                range_end
            );
        }

        // Cleanup
        remove_file("simple.vcd".to_string());
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
    let mut files = OPENED_FILES.lock().unwrap();
    let file = files.iter_mut().find(|f| f.path.ends_with(&filename) || f.path == filename)
        .ok_or_else(|| format!("File not found: {}", filename))?;

    let waveform = &mut file.wave;

    let signal_ref = SignalRef::from_index(signal_id).ok_or("Invalid signal ID")?;
    
    // Load the signal data if not already loaded (required for lazy-loaded backends)
    waveform.load_signals(&[signal_ref]);

    let signal = waveform.get_signal(signal_ref).ok_or("Signal not found")?;
    let time_table = waveform.time_table();

    let mut result = Vec::new();
    let mut last_before_start: Option<SignalChange> = None;

    for (time_idx, value) in signal.iter_changes() {
         let time = time_table[time_idx as usize];

         if time < start {
             // Keep track of the last change before the start time
             last_before_start = Some(SignalChange {
                 time,
                 value: format!("{}", value),
             });
             continue;
         }

         if time > end {
             // Add the first change after the end time
             result.push(SignalChange {
                 time,
                 value: format!("{}", value),
             });
             break;
         }

         result.push(SignalChange {
             time,
             value: format!("{}", value),
         });
    }

    // Build final result with boundary change at the start
    // More efficient than insert(0, ...) which requires shifting all elements
    if let Some(before) = last_before_start {
        let mut changes = Vec::with_capacity(result.len() + 1);
        changes.push(before);
        changes.extend(result);
        Ok(changes)
    } else {
        Ok(result)
    }
}

#[wasm_bindgen]
pub fn get_signal_changes_wasm(filename: String, signal_id: usize, start: u64, end: u64) -> Result<JsValue, String> {
    let changes = get_signal_changes(filename, signal_id, start, end)?;
    serde_wasm_bindgen::to_value(&changes).map_err(|e| e.to_string())
}
