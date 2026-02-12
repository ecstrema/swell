# Swell - GitHub Copilot Instructions

## Repository Overview

Swell is a **waveform viewer application** built with:
- **Frontend**: Tauri + Vite + Vanilla TypeScript/JavaScript
- **Backend**: Rust library compiled to both native (via Tauri) and WebAssembly (for browser)
- **Purpose**: Load and visualize waveform files (VCD, FST, GHW formats) with signal data access

The project uses a hybrid architecture where the same Rust backend code is compiled for:
1. Native desktop app using Tauri
2. Web/WASM version using wasm-pack

## Build & Test Instructions

### Prerequisites
- **Rust**: 1.93.0+ (with cargo)
- **Node/npm**: npm 11.6.2+ (Bun is preferred but npm works)
- **wasm-pack**: Required for building WebAssembly (install with `cargo install wasm-pack`)
- **Tauri CLI**: Installed as dev dependency

### Installation
**ALWAYS run npm install first before any build or test operations:**
```bash
npm install
```

### Build Steps

**1. Build WebAssembly (CRITICAL - must be done first):**
```bash
npm run wasm:build
# or: cd backend && wasm-pack build --target web
```
This creates `backend/pkg/` with compiled WASM files. **Frontend tests and builds will fail without this step.**

**Note**: wasm-pack may show a warning about failing to download wasm-opt from GitHub, but the WASM will still build successfully. This can be safely ignored.

**2. Build Frontend:**
```bash
npm run build
```
Output goes to `dist/` directory. Build takes ~90ms after WASM is built.

**3. Development Server:**
```bash
npm run dev
```
Runs on port 1420 (strictly enforced).

### Testing

**Frontend Tests (Vitest):**
```bash
npm test
# or: npm run test:ui for UI mode
```
- **CRITICAL**: Must build WASM first (`npm run wasm:build`) or tests importing backend will fail
- Tests are in `src/**/*.test.ts` files
- Uses jsdom environment with global test setup in `src/test-setup.ts`
- Expected: 34 tests passing across 6 test files

**Backend Tests (Rust):**
```bash
npm run test:rust
# or: cd backend && cargo test
```
- Expected: 2 tests passing (1 unit test, 1 integration test)
- First run takes ~12s to compile

**Full Test Suite:**
Run in this order:
```bash
npm run wasm:build   # ALWAYS first
npm run test:rust    # Backend tests
npm run test         # Frontend tests
```

### Common Issues & Workarounds

1. **Error: "Failed to resolve import ../backend/pkg/backend"**
   - **Cause**: WASM not built
   - **Fix**: Run `npm run wasm:build` first

2. **wasm-opt download failure warning**
   - **Impact**: None - WASM builds successfully despite warning
   - **Action**: Safe to ignore

3. **Port already in use (1420)**
   - **Fix**: Kill existing process or use different port via config

## Project Layout

### Directory Structure
```
/
├── .github/
│   └── workflows/          # CI/CD workflows
│       ├── test.yml       # Main test workflow (runs on PR/push)
│       ├── deploy.yml     # Deployment workflow
│       └── tauri-release.yml
├── src/                   # Frontend source (TypeScript/JavaScript)
│   ├── backend.ts         # Unified interface for WASM/Tauri backend
│   ├── components/        # UI components
│   ├── settings/          # Settings system
│   ├── shortcuts/         # Keyboard shortcuts system
│   ├── styles/            # CSS styles
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── backend/               # Rust backend (compiles to native + WASM)
│   ├── src/              # Rust source code
│   ├── tests/            # Rust integration tests
│   ├── pkg/              # WASM output (generated, not committed)
│   ├── Cargo.toml        # Rust dependencies
│   └── README.md         # Backend architecture docs
├── src-tauri/            # Tauri native app configuration
│   ├── src/              # Tauri-specific Rust code
│   ├── Cargo.toml        # Tauri app dependencies
│   └── tauri.conf.json   # Tauri configuration
├── docs/                 # Documentation
│   ├── COMMAND_PALETTE.md
│   ├── SETTINGS.md
│   ├── THEME_IMPLEMENTATION.md
│   └── SHORTCUT_SYSTEM.md
├── dist/                 # Build output (generated)
├── package.json          # Node dependencies & scripts
└── vite.config.js        # Vite build configuration
```

### Key Configuration Files
- `package.json`: Build scripts, frontend dependencies
- `vite.config.js`: Frontend build config, test setup
- `backend/Cargo.toml`: Backend Rust dependencies (WASM)
- `src-tauri/Cargo.toml`: Tauri app Rust dependencies (native)
- `src-tauri/tauri.conf.json`: Tauri app configuration

### Architecture Details

**Backend (`backend/`):**
- Rust library with `crate-type = ["cdylib", "rlib"]`
- Uses `wellen` crate for waveform parsing
- Exposes WASM API via `wasm-bindgen`
- Maintains global state for loaded waveform files
- Three main APIs: File Loading, Hierarchy Access, Signal Data

**Frontend (`src/`):**
- Entry point: `src/main.ts`
- HTML: `src/index.html`
- Backend interface: `src/backend.ts` (abstracts WASM vs Tauri)
- Uses vanilla JavaScript with TypeScript
- Component-based architecture in `src/components/`

**Tauri App (`src-tauri/`):**
- Native desktop app wrapper
- Imports backend as path dependency: `backend = { version = "0.1.0", path = "../backend" }`
- Provides native file dialogs and OS integration

### CI/CD Workflows

**Test Workflow (`.github/workflows/test.yml`)**:
Runs on push/PR to main/master branches:
1. Setup Rust, Node (Bun), wasm-pack
2. Install dependencies: `bun install --frozen-lockfile`
3. Build WASM: `bun run wasm:build`
4. Run backend tests: `bun run test:rust`
5. Run frontend tests: `bun run test`

**Note**: CI uses Bun, but npm works for local development.

## Development Guidelines

### Making Changes

1. **Backend (Rust) Changes:**
   - Modify code in `backend/src/`
   - Test: `cd backend && cargo test`
   - Rebuild WASM: `npm run wasm:build`
   - Test frontend integration: `npm test`

2. **Frontend Changes:**
   - Modify code in `src/`
   - Test: `npm test`
   - Visual check: `npm run dev`

3. **Tests:**
   - Frontend tests use Vitest with jsdom
   - Backend tests use standard Rust test framework
   - Add tests in same directory as source (`.test.ts` for frontend, `#[test]` for Rust)

### Validation Steps

Before submitting changes:
```bash
npm run wasm:build    # If backend changed
npm run test:rust     # Backend tests
npm run test          # Frontend tests
npm run build         # Verify build succeeds
```

### Dependencies

- **Adding Rust dependencies**: Edit `backend/Cargo.toml` or `src-tauri/Cargo.toml`
- **Adding Node dependencies**: Use `npm install <package>`
- **After adding dependencies**: Always rebuild and test

### Important Notes

- **ALWAYS build WASM before running frontend tests or builds**
- The `backend/pkg/` directory is generated and git-ignored
- Rust edition 2024 is used (newer projects may default to 2021)
- Frontend tests import real WASM, not mocks
- Some tests produce stderr warnings (e.g., "Command not found: fake-cmd") - this is expected

## Documentation Files

- `README.md`: Project overview and setup
- `backend/README.md`: Backend architecture and API details
- `docs/COMMAND_PALETTE.md`: Command palette feature
- `docs/SETTINGS.md`: Settings system
- `docs/THEME_IMPLEMENTATION.md`: Theming system
- `docs/SHORTCUT_SYSTEM.md`: Keyboard shortcuts
- `src/shortcuts/ARCHITECTURE.md`: Shortcuts architecture
- `src/shortcuts/README.md`: Shortcuts usage

## Quick Reference

**Most Common Commands:**
```bash
npm install              # Install dependencies (FIRST)
npm run wasm:build       # Build backend to WASM (BEFORE tests)
npm test                 # Run frontend tests
npm run test:rust        # Run backend tests
npm run build            # Build for production
npm run dev              # Start dev server
```

**Critical Path for Changes:**
1. `npm install` (if dependencies changed)
2. Make code changes
3. `npm run wasm:build` (if backend changed)
4. `npm test` and `npm run test:rust`
5. `npm run build` (verify production build)

**Trust these instructions** - they have been validated. Only search for additional information if you encounter errors or need details beyond what's documented here.
