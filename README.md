# Swell - Waveform Viewer

Swell is a modern waveform viewer application for digital design verification. It supports VCD, FST, and GHW waveform formats.

## Features

- Load and visualize waveform files (VCD, FST, GHW)
- Hierarchical signal browser
- Signal value inspection
- Cross-platform support (Desktop via Tauri, Web via WebAssembly)
- **Command-line file opening** - Open waveform files directly from the command line
- **Iconify integration (unplugin-icons)** - Build-time icon imports with tree-shaking from 150+ icon sets

## Usage

### Desktop Application (Tauri)

You can open waveform files directly from the command line:

```bash
# Open a single file
swell path/to/waveform.vcd

# Open multiple files
swell design.vcd testbench.fst signals.ghw

# Display help information
swell --help

# Display version information
swell --version
```

The application will automatically load all specified files on startup.

### Web Application

Access the web version at the deployed URL and use the "Open File" button to load waveform files from your local filesystem.

## Example Files

The `examples/` directory contains sample waveform files for testing:
- VCD files: `simple.vcd`, `counter.vcd`
- FST file: `example.fst`
- GHW files: `simple.ghw`, `time_test.ghw`

See [examples/README.md](examples/README.md) for details about each file.

## Development

### Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Icons

Swell uses [Iconify](https://iconify.design/) via [unplugin-icons](https://github.com/unplugin/unplugin-icons), providing access to thousands of icons from over 150 icon sets including Material Design Icons, Font Awesome, Bootstrap Icons, and more. Icons are imported at build time with automatic tree-shaking - only the icons you use are bundled.

- **Demo**: Open `src/iconify-demo.html` in development mode to see examples
- **Documentation**: See [docs/ICONIFY.md](docs/ICONIFY.md) for usage instructions
- **Icon Browser**: Browse available icons at [icon-sets.iconify.design](https://icon-sets.iconify.design/)
