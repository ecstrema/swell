import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as backend from './backend.js';

// Mock dependencies
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
    open: vi.fn(),
}));

// Mock the entire WASM module
vi.mock('../backend/pkg/backend', () => ({
    default: vi.fn(),
    add_file_bytes: vi.fn(),
    get_files: vi.fn(),
    remove_file: vi.fn(),
    get_hierarchy: vi.fn(),
}));

// Need to access the mocks to assert on them, but since we are testing `backend.ts` logic
// which imports them, we ideally want to spy on the imported modules.
import { invoke } from '@tauri-apps/api/core';
import * as wasm from '../backend/pkg/backend';

describe('Backend Interface', () => {

    // We need to manipulate the window object to simulate Tauri environment or Web environment
    // But backend.ts checks `window.__TAURI_INTERNALS__` at module load time.
    // So we can't easily change it between tests without reloading the module.
    // For now, we will test the environment we are in (Jsdom).
    // In Jsdom, `window.__TAURI_INTERNALS__` is undefined by default, so it tests the WEB path.

    it('should be in Web mode by default in test environment', () => {
        expect(backend.isTauri).toBe(false);
    });

    describe('Web Mode', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('addFile should use WASM implementation for File objects', async () => {
            const file = new File(['dummy content'], 'test.vcd');
            const fileBytes = new Uint8Array(await file.arrayBuffer());

            // Mock the return value
            vi.mocked(wasm.add_file_bytes).mockReturnValue('file-id-123');

            const result = await backend.addFile(file);

            expect(wasm.add_file_bytes).toHaveBeenCalledWith('test.vcd', expect.any(Uint8Array));
            expect(result).toBe('file-id-123');
            expect(invoke).not.toHaveBeenCalled();
        });

        it('getFiles should use WASM implementation', async () => {
            vi.mocked(wasm.get_files).mockReturnValue(['file1', 'file2']);

            const result = await backend.getFiles();

            expect(wasm.get_files).toHaveBeenCalled();
            expect(result).toEqual(['file1', 'file2']);
            expect(invoke).not.toHaveBeenCalled();
        });

         it('removeFile should use WASM implementation', async () => {
             await backend.removeFile('file1');
             expect(wasm.remove_file).toHaveBeenCalledWith('file1');
         });

         it('loadExampleFile should use correct path with BASE_URL', async () => {
             // Note: import.meta.env.BASE_URL is replaced by Vite at build time,
             // so we can't mock different values in runtime tests.
             // This test verifies the code logic; actual path replacement is verified
             // by building with different VITE_BASE_PATH values.
             
             // Mock fetch
             const mockFetch = vi.fn().mockResolvedValue({
                 ok: true,
                 arrayBuffer: async () => new ArrayBuffer(100)
             });
             global.fetch = mockFetch;

             // Mock WASM add_file_bytes
             vi.mocked(wasm.add_file_bytes).mockReturnValue('example-file-id');

             await backend.loadExampleFile('simple.vcd');

             // Should use BASE_URL (default is '/')
             expect(mockFetch).toHaveBeenCalledWith('/examples/simple.vcd');
             expect(wasm.add_file_bytes).toHaveBeenCalledWith('simple.vcd', expect.any(Uint8Array));
         });
    });
});
