use std::cell::RefCell;
use std::collections::HashMap;

use wasm_bindgen::prelude::*;
use web_sys::{js_sys::{Array, Object}, File};
use wellen::{simple::{read, Waveform}, SignalRef};

mod hierarchy;


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

    pub fn open_wave_file_wasm(&mut self, _file: File) -> Result<(), String> {
        Err("Not implemented".to_string())
    }

    pub fn get_hierarchy(&self, filename: String) -> Result<Object, JsValue> {
        let waveform = self.files.get(&filename);
        match waveform {
            Some(waveform) => {
                let hierarchy = waveform.hierarchy();

                // Iterate over the scopes and vars in the hierarchy, and return an object that looks like this:
                // {
                //     name: "root",
                //     ref: 42,
                //     vars: [
                //         { name: "var1", ref: 1 },
                //         { name: "var2", ref: 2 },
                //     ],
                //     scopes: [
                //         // Similar to the above, but nested
                //     ]
                // },

                let js_hierarchy = Object::new();
                js_sys::Reflect::set(&js_hierarchy, &"name".into(), &"root".into())?;
                js_sys::Reflect::set(&js_hierarchy, &"ref".into(), &0.into())?;

                let vars = Array::new();
                let scopes = Array::new();

                for scope_ref in hierarchy.scopes() {
                    let scope = &hierarchy[scope_ref];

                    let js_scope = Object::new();
                    js_sys::Reflect::set(&js_scope, &"name".into(), &scope.name(hierarchy).into())?;
                    js_sys::Reflect::set(&js_scope, &"ref".into(), &JsValue::from_f64(scope_ref.index() as f64))?;

                    let js_vars = Array::new();
                    for var_ref in scope.vars(hierarchy) {
                        let var = &hierarchy[var_ref];
                        let js_var = Object::new();
                        js_sys::Reflect::set(&js_var, &"name".into(), &var.name(hierarchy).into())?;
                        js_sys::Reflect::set(&js_var, &"ref".into(), &JsValue::from_f64(var_ref.index() as f64))?;
                        js_vars.push(&js_var);
                    }
                    js_sys::Reflect::set(&js_scope, &"vars".into(), &js_vars)?;

                    let js_scopes = Array::new();
                    for sub_scope_ref in scope.scopes(hierarchy) {
                        let sub_scope = &hierarchy[sub_scope_ref];
                        let js_sub_scope = Object::new();
                        js_sys::Reflect::set(&js_sub_scope, &"name".into(), &sub_scope.name(hierarchy).into())?;
                        js_sys::Reflect::set(&js_sub_scope, &"ref".into(), &JsValue::from_f64(sub_scope_ref.index() as f64))?;
                        js_scopes.push(&js_sub_scope);
                    }
                    js_sys::Reflect::set(&js_scope, &"scopes".into(), &js_scopes)?;

                    scopes.push(&js_scope);
                }

                js_sys::Reflect::set(&js_hierarchy, &"vars".into(), &vars)?;
                js_sys::Reflect::set(&js_hierarchy, &"scopes".into(), &scopes)?;

                Ok(js_hierarchy)
            }
            None => Err(JsValue::from_str(format!("File not found: {}", filename).as_str())),
        }
    }

    pub fn get_changes(&self, filename: String, signal_ref: SignalRef, start: u64, end: u64) -> Result<Object, JsValue> {
        let waveform = self.files.get(&filename);
        match waveform {
            Some(waveform) => {
                let result = Object::new();
                
                // Get signal changes in the specified time range
                let signal = waveform.get_signal(signal_ref)
                    .ok_or_else(|| JsValue::from_str("Signal not found"))?;
                
                let time_table = waveform.time_table();
                let changes = Array::new();
                
                // Iterate through signal changes and filter by time range
                for (time_idx, value) in signal.iter_changes() {
                    let time = time_table[time_idx as usize];
                    
                    if time >= start && time <= end {
                        let change = Object::new();
                        js_sys::Reflect::set(&change, &"time".into(), &JsValue::from_f64(time as f64))?;
                        js_sys::Reflect::set(&change, &"value".into(), &JsValue::from_str(&format!("{}", value)))?;
                        changes.push(&change);
                    }
                    
                    // Stop if we've passed the end time
                    if time > end {
                        break;
                    }
                }
                
                js_sys::Reflect::set(&result, &"changes".into(), &changes)?;
                Ok(result)
            }
            None => Err(JsValue::from_str(format!("File not found: {}", filename).as_str())),
        }
    }
}

#[wasm_bindgen]
pub fn open_wave_file_wasm(file: File) -> Result<(), String> {
    STATE.with(|state| state.borrow_mut().open_wave_file_wasm(file))
}

#[wasm_bindgen]
pub fn get_hierarchy(filename: String) -> Result<Object, JsValue> {
    STATE.with(|state| state.borrow().get_hierarchy(filename))
}

#[wasm_bindgen]
pub fn get_changes(filename: String, signal_ref: u32, start: f64, end: f64) -> Result<Object, JsValue> {
    let signal = SignalRef::from_index(signal_ref as usize)
        .ok_or_else(|| JsValue::from_str("Invalid signal reference"))?;
    STATE.with(|state| state.borrow().get_changes(filename, signal, start as u64, end as u64))
}
