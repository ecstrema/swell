import { vi } from 'vitest';
import { File as NodeFile } from 'node:buffer';
import 'vitest-canvas-mock';
import 'fake-indexeddb/auto';

// Polyfill File API with Node.js native File which has arrayBuffer() method
global.File = NodeFile as typeof File;

// requestAnimationFrame is used by several components; jsdom doesn’t provide it
// and the old tests were failing with “requestAnimationFrame is not a function”.
// add a cheap timeout-based shim so tests can call `open()` without blowing up.
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(cb, 0) as unknown as number;
}

// Mock ResizeObserver for jsdom environment
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock the backend module for all tests
vi.mock('../backend/pkg/backend', () => ({
    default: vi.fn(),
    add_file_bytes: vi.fn(),
    get_files: vi.fn(() => []),
    remove_file: vi.fn(),
    get_hierarchy_wasm: vi.fn(),
    get_signal_changes_wasm: vi.fn()
}));
