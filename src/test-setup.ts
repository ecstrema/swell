import { vi } from 'vitest';

// Mock the backend module for all tests  
vi.mock('../backend/pkg/backend', () => ({
    default: vi.fn(),
    add_file_bytes: vi.fn(),
    get_files: vi.fn(() => []),
    remove_file: vi.fn(),
    get_hierarchy_wasm: vi.fn(),
    get_signal_changes_wasm: vi.fn()
}));
