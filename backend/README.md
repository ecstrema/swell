# Swell Backend

The Swell backend is a Rust library that provides waveform file loading and signal data access. It's designed to be used both as a native library (via Tauri) and as a WebAssembly module in the browser.

## Architecture

The backend maintains a global state that stores loaded waveform files in memory. It provides three main APIs:

1. **File Loading**: Load VCD, FST, GHW, and other waveform files
2. **Hierarchy Access**: Get the hierarchical structure of signals and scopes
3. **Signal Data**: Retrieve signal value changes within specific time ranges

## Building

### Native Library

```bash
cargo build --release
```

### WebAssembly

First, add the WASM target:

```bash
rustup target add wasm32-unknown-unknown
```

Then build for WASM:

```bash
cargo build --target wasm32-unknown-unknown --lib
```

Or use wasm-pack for a complete build with TypeScript bindings:

```bash
wasm-pack build --target web
```

## API Reference

### State Management

The backend uses thread-local storage to maintain state:

```rust
pub struct State {
    pub files: HashMap<String, Waveform>,
}
```

### Functions

#### `open_wave_file_native(filename: String) -> Result<(), String>`

**Native only**: Opens a waveform file from the filesystem.

**Parameters:**
- `filename`: Full path to the waveform file

**Returns:**
- `Ok(())` on success
- `Err(String)` with error message on failure

**Example (Tauri):**
```typescript
import { invoke } from '@tauri-apps/api/core';

await invoke('open_wave_file_native', { filename: '/path/to/file.vcd' });
```

#### `open_wave_file_wasm(file: File) -> Result<(), String>`

**WASM only**: Opens a waveform file from a browser File object.

**Note:** Currently not fully implemented.

**Parameters:**
- `file`: Browser File object

**Returns:**
- `Ok(())` on success
- `Err(String)` with error message on failure

#### `get_hierarchy(filename: String) -> Result<Object, JsValue>`

Gets the hierarchical structure of signals and scopes in a loaded waveform file.

**Parameters:**
- `filename`: Name/path of the previously loaded file

**Returns:**
A JavaScript object with the following structure:

```typescript
interface HierarchyRoot {
  name: string;        // Always "root"
  ref: number;         // Always 0
  vars: HierarchyVar[];
  scopes: HierarchyScope[];
}

interface HierarchyScope {
  name: string;        // Scope name
  ref: number;         // Unique scope reference
  vars: HierarchyVar[];
  scopes: HierarchyScope[];  // Nested scopes
}

interface HierarchyVar {
  name: string;        // Variable/signal name
  ref: number;         // Unique variable reference (signal ref)
}
```

**Example:**
```typescript
const hierarchy = await getHierarchy('/path/to/file.vcd');
console.log(hierarchy.scopes[0].vars[0].name);  // First variable name
```

#### `get_changes(filename: String, signal_ref: u32, start: f64, end: f64) -> Result<Object, JsValue>`

Retrieves signal value changes within a specified time range.

**Parameters:**
- `filename`: Name/path of the previously loaded file
- `signal_ref`: Signal reference number (obtained from hierarchy)
- `start`: Start time (inclusive)
- `end`: End time (inclusive)

**Returns:**
A JavaScript object containing an array of changes:

```typescript
interface SignalChangesResult {
  changes: SignalChange[];
}

interface SignalChange {
  time: number;   // Timestamp
  value: string;  // Signal value as string
}
```

**Example:**
```typescript
const result = await getChanges('/path/to/file.vcd', 42, 0, 1000);
for (const change of result.changes) {
  console.log(`Time ${change.time}: ${change.value}`);
}
```

## Usage Examples

### Tauri (Native)

```typescript
import { invoke } from '@tauri-apps/api/core';

// Load a file
await invoke('open_wave_file_native', { 
  filename: '/path/to/waveform.vcd' 
});

// Get hierarchy
const hierarchy = await invoke('get_hierarchy', { 
  filename: '/path/to/waveform.vcd' 
});

// Get signal changes
const changes = await invoke('get_changes', {
  filename: '/path/to/waveform.vcd',
  signalRef: 42,
  start: 0,
  end: 10000
});
```

### WebAssembly

```typescript
import * as wasm from './pkg/backend.js';

// Get hierarchy (after loading file)
const hierarchy = wasm.get_hierarchy('/path/to/file.vcd');

// Get signal changes
const changes = wasm.get_changes('/path/to/file.vcd', 42, 0.0, 10000.0);
```

## Dependencies

The backend uses the following key dependencies:

- **wellen**: Waveform parsing library supporting VCD, FST, GHW, etc.
- **wasm-bindgen**: Rust/WASM/JavaScript interop
- **web-sys**: Web APIs for WASM

## State Management

The backend uses thread-local storage via `thread_local!` macro to maintain state. This is safe because:

1. In native (Tauri) builds, all calls happen on the same thread
2. In WASM builds, JavaScript is single-threaded by nature

The state is accessed using the `STATE.with()` pattern:

```rust
STATE.with(|state| {
    let state = state.borrow();
    // ... use state
})
```

## Future Improvements

- [ ] Implement WASM file loading from browser File objects
- [ ] Add signal filtering and search capabilities
- [ ] Support streaming large files
- [ ] Add caching for frequently accessed signal data
- [ ] Implement signal value interpolation
- [ ] Add support for custom time units
