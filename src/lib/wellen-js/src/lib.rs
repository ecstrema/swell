use std::collections::HashMap;
use std::sync::{LazyLock, Mutex};

use wasm_bindgen::prelude::*;
use wellen::simple::{read, Waveform};

#[wasm_bindgen]
extern "C" {
    pub fn alert(s: &str);
}

struct State {
    files: HashMap<String, Waveform>,
}

static STATE: LazyLock<Mutex<State>> = LazyLock::new(|| Mutex::new(State::new()));

impl State {
    fn new() -> State {
        State { files: HashMap::new() }
    }

    fn open(&mut self, name: String) -> String {
        match read(name.clone()) {
            Ok(waveform) => {
                self.files.insert(name, waveform);
                "".into()
            }
            Err(e) => {
                format!("Failed to open file: {:?}", e)
            }
        }
    }
}

#[wasm_bindgen]
pub fn open(name: String) -> String {
    match STATE.lock() {
        Ok(mut state) => state.open(name),
        Err(_) => "Failed to lock state".into(),
    }
}
