# Swell Backend

The Swell backend is a Rust library that provides waveform file loading and signal data access. It's designed to be used both as a native library (via Tauri) and as a WebAssembly module in the browser.

## Architecture

The backend maintains a global state that stores loaded waveform files in memory. It provides three main APIs:

1. **File Loading**: Load VCD, FST, GHW, and other waveform files
2. **Hierarchy Access**: Get the hierarchical structure of signals and scopes
3. **Signal Data**: Retrieve signal value changes within specific time ranges

## Building for WebAssembly

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
wasm-pack build --target web
```
