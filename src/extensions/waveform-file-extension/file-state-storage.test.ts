import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveFileState, loadFileState, removeFileState, clearAllFileStates, FileState } from './file-state-storage';

// Mock the backend module
vi.mock('../../../backend/index.js', () => ({
    isTauri: false
}));

// Mock the settings storage module (not used here but kept for parity)
vi.mock('../../../extensions/settings-extension/settings-storage.js', () => ({
    getSetting: vi.fn(),
    setSetting: vi.fn()
}));

describe('file-state-storage (moved to waveform extension)', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        vi.clearAllMocks();
    });

    describe('saveFileState and loadFileState', () => {
        it('should save and load file state', async () => {
            const fileState: FileState = {
                version: 'V0',
                items: [
                    { _type: 'timeline', name: 'Timeline 1' },
                    { _type: 'signal', ref: 1, name: 'clk' }
                ],
                visibleStart: 0,
                visibleEnd: 1000,
                timestamp: Date.now()
            };

            await saveFileState('/path/to/test.vcd', fileState);
            const loaded = await loadFileState('/path/to/test.vcd');

            expect(loaded).not.toBeNull();
            expect(loaded?.items).toHaveLength(2);
            expect(loaded?.visibleStart).toBe(0);
            expect(loaded?.visibleEnd).toBe(1000);
        });

        it('should normalize file paths consistently', async () => {
            const fileState: FileState = {
                version: 'V0',
                items: [ { _type: 'signal', ref: 1, name: 'sig' } ],
                visibleStart: 0,
                visibleEnd: 100,
                timestamp: Date.now()
            };

            await saveFileState('/path/to/test.vcd', fileState);
            const loaded = await loadFileState('\\path\\to\\test.vcd');
            expect(loaded).not.toBeNull();
            expect(loaded?.items).toHaveLength(1);
        });

        it('should return null for non-existent file state', async () => {
            const loaded = await loadFileState('nonexistent.vcd');
            expect(loaded).toBeNull();
        });

        it('should update timestamp when saving', async () => {
            const fileState: FileState = {
                version: 'V0',
                items: [ { _type: 'signal', ref: 1, name: 'sig' } ],
                visibleStart: 0,
                visibleEnd: 100,
                timestamp: 0
            };

            const before = Date.now();
            await saveFileState('test.vcd', fileState);
            const after = Date.now();

            const loaded = await loadFileState('test.vcd');
            expect(loaded).not.toBeNull();
            expect(loaded!.timestamp).toBeGreaterThanOrEqual(before);
            expect(loaded!.timestamp).toBeLessThanOrEqual(after);
        });

        it('should handle multiple files independently', async () => {
            const state1: FileState = {
                version: 'V0',
                items: [ { _type: 'signal', ref: 1, name: 'a' }, { _type: 'signal', ref: 2, name: 'b' } ],
                visibleStart: 0,
                visibleEnd: 100,
                timestamp: Date.now()
            };

            const state2: FileState = {
                version: 'V0',
                items: [ { _type: 'timeline', name: 'Timeline 1' }, { _type: 'signal', ref: 5, name: 'x' } ],
                visibleStart: 500,
                visibleEnd: 1500,
                timestamp: Date.now()
            };

            await saveFileState('file1.vcd', state1);
            await saveFileState('file2.vcd', state2);

            const loaded1 = await loadFileState('file1.vcd');
            const loaded2 = await loadFileState('file2.vcd');

            expect(loaded1?.items).toHaveLength(2);
            expect(loaded2?.items).toHaveLength(2);
        });
    });

    describe('removeFileState', () => {
        it('should remove file state', async () => {
            const fileState: FileState = {
                version: 'V0',
                items: [ { _type: 'signal', ref: 1, name: 'sig' } ],
                visibleStart: 0,
                visibleEnd: 100,
                timestamp: Date.now()
            };

            await saveFileState('test.vcd', fileState);
            expect(await loadFileState('test.vcd')).not.toBeNull();

            await removeFileState('test.vcd');
            expect(await loadFileState('test.vcd')).toBeNull();
        });
    });

    describe('clearAllFileStates', () => {
        it('should clear all file states', async () => {
            const state: FileState = {
                version: 'V0',
                items: [ { _type: 'signal', ref: 1, name: 'sig' } ],
                visibleStart: 0,
                visibleEnd: 100,
                timestamp: Date.now()
            };

            await saveFileState('file1.vcd', state);
            await saveFileState('file2.vcd', state);

            expect(await loadFileState('file1.vcd')).not.toBeNull();
            expect(await loadFileState('file2.vcd')).not.toBeNull();

            await clearAllFileStates();

            expect(await loadFileState('file1.vcd')).toBeNull();
            expect(await loadFileState('file2.vcd')).toBeNull();
        });
    });
});
