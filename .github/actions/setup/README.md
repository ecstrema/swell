# Setup Swell Development Environment

This composite action sets up the complete development environment for Swell, including:

- Rust toolchain with optional targets
- wasm-pack for WebAssembly compilation
- Bun runtime and package manager
- Project dependencies (via `bun install`)
- Caching for:
  - Rust build artifacts
  - Node modules
  - WASM build outputs

## Usage

### Basic Usage (Test Workflow)

```yaml
- name: Setup development environment
  uses: ./.github/actions/setup
```

### With Custom Rust Targets (Deploy Workflow)

```yaml
- name: Setup development environment
  uses: ./.github/actions/setup
  with:
    rust-targets: wasm32-unknown-unknown
```

### With Multiple Workspaces (Tauri Release Workflow)

```yaml
- name: Setup development environment
  uses: ./.github/actions/setup
  with:
    rust-targets: ${{ matrix.target }}, wasm32-unknown-unknown
    rust-workspaces: |
      backend -> target
      src-tauri -> target
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `bun-version` | Bun version to install | No | `latest` |
| `wasm-pack-version` | wasm-pack version to install | No | `latest` |
| `rust-cache` | Enable Rust caching | No | `true` |
| `rust-targets` | Additional Rust targets to install (comma-separated) | No | `''` |
| `rust-workspaces` | Rust workspaces for caching | No | `backend -> target` |

## Caching Strategy

The action implements multiple levels of caching:

1. **Rust Build Cache**: Uses `Swatinem/rust-cache@v2` to cache Rust build artifacts
2. **Node Modules Cache**: Caches `node_modules` and Bun's install cache based on `bun.lock`
3. **WASM Build Cache**: Caches `backend/pkg` based on backend source files, Cargo files, and wasm-pack version

### Cache Invalidation

- **Rust cache**: Automatically invalidated when Rust toolchain or dependencies change (handled by rust-cache action)
- **Node modules cache**: Invalidated when `bun.lock` changes
- **WASM cache**: Invalidated when:
  - Backend source files change (`backend/src/**`)
  - Cargo dependencies change (`backend/Cargo.toml`, `backend/Cargo.lock`)
  - wasm-pack version changes

**Note**: The WASM cache does not invalidate on Rust toolchain version changes alone. This is intentional, as WASM builds for the same source code typically produce identical output across Rust versions. If you need to force a cache invalidation, bump the `wasm-pack-version` input or modify a backend source file.

This ensures fast CI/CD runs by reusing previously built artifacts when possible.
