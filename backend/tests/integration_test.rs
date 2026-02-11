#[cfg(test)]
mod tests {
    // Tests for the Rust backend can be placed here.
    // Since this project might update to use `wasm-bindgen-test`, simple `#[test]`
    // might not work directly for WASM targets without configuration.
    // However, non-wasm logic can be tested normally.

    #[test]
    fn it_works() {
        let result = 2 + 2;
        assert_eq!(result, 4);
    }
}
