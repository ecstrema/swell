use wasm_bindgen::prelude::*;
use web_sys::{File};

mod hierarchy;

#[wasm_bindgen]
pub async fn load_file(file: File) -> Result<String, String> {
    let filename = file.name();
    let promise = file.array_buffer();
    let future = wasm_bindgen_futures::JsFuture::from(promise);
    let js_val = future.await.map_err(|e| format!("{:?}", e))?;
    let bytes = js_sys::Uint8Array::new(&js_val).to_vec();

    Ok("Try to load using wellen".to_string())
}
