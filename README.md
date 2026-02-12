# Swell - Waveform Viewer

Swell is a modern waveform viewer application for digital design verification. It supports VCD, FST, and GHW waveform formats.

## Features

- Load and visualize waveform files (VCD, FST, GHW)
- Hierarchical signal browser
- Signal value inspection
- Cross-platform support (Desktop via Tauri, Web via WebAssembly)

## Example Files

The `examples/` directory contains sample waveform files for testing:
- VCD files: `simple.vcd`, `counter.vcd`
- FST file: `example.fst`
- GHW files: `simple.ghw`, `time_test.ghw`

See [examples/README.md](examples/README.md) for details about each file.

## Development

### Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
