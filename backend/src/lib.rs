use std::cell::RefCell;
use std::collections::HashMap;

use wasm_bindgen::prelude::*;
use web_sys::{js_sys::{Array, Object}, File};
use wellen::{simple::{read, Waveform}, Hierarchy};

mod hierarchy;


pub struct State {
    files: HashMap<String, Waveform>,
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

                // Iterate over the scopes and vars in the hierarchy, and return an array that looks like this:
                // {
                //     name: "root",
                //     ref: 42,
                //     vars: [
                //         { name: "var1", value: 1 },
                //         { name: "var2", value: 2 },
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
                    let scope = hierarchy[scope_ref];

                    let js_scope = Object::new();
                    js_sys::Reflect::set(&js_scope, &"name".into(), &scope.name(&hierarchy).into())?;
                    js_sys::Reflect::set(&js_scope, &"ref".into(), &JsValue::from_f64(scope_ref as f64))?;

                    let js_vars = Array::new();
                    for var in scope.vars() {
                        let js_var = Object::new();
                        js_sys::Reflect::set(&js_var, &"name".into(), &var.name().into())?;
                        js_sys::Reflect::set(&js_var, &"value".into(), &var.value().into())?;
                        js_vars.push(&js_var);
                    }
                    js_sys::Reflect::set(&js_scope, &"vars".into(), &js_vars)?;

                    let js_scopes = Array::new();
                    for sub_scope in scope.scopes() {
                        let js_sub_scope = Object::new();
                        js_sys::Reflect::set(&js_sub_scope, &"name".into(), &sub_scope.name().into())?;
                        js_sys::Reflect::set(&js_sub_scope, &"ref".into(), &sub_scope.ref_().into())?;
                        js_scopes.push(&js_sub_scope);
                    }
                    js_sys::Reflect::set(&js_scope, &"scopes".into(), &js_scopes)?;

                    scopes.push(&js_scope);
                }

                Ok(js_hierarchy)
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
