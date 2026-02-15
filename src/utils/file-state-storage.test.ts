import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveFileState, loadFileState, removeFileState, clearAllFileStates } from './file-state-storage';
import type { FileState } from './file-state-storage';

// Mock the backend module
vi.mock('../backend.js', () => ({
    isTauri: false
}));

// Mock the settings storage module
vi.mock('../settings/settings-storage.js', () => ({
    getSetting: vi.fn(),
    setSetting: vi.fn()
}));

describe('file-state-storage', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        vi.clearAllMocks();
    });

    describe('saveFileState and loadFileState', () => {
        it('should save and load file state', async () => {
            const fileState: FileState = {
                selectedSignalRefs: [1, 2, 3],
                selectedSignalNames: ['clk', 'reset', 'data'],
                visibleStart: 0,
                visibleEnd: 1000,
                timelineCount: 1,
                timestamp: Date.now()
            };

            await saveFileState('/path/to/test.vcd', fileState);
            const loaded = await loadFileState('/path/to/test.vcd');

            expect(loaded).not.toBeNull();
            expect(loaded?.selectedSignalRefs).toEqual([1, 2, 3]);
            expect(loaded?.selectedSignalNames).toEqual(['clk', 'reset', 'data']);
            expect(loaded?.visibleStart).toBe(0);
            expect(loaded?.visibleEnd).toBe(1000);
            expect(loaded?.timelineCount).toBe(1);
        });

        it('should normalize file paths consistently', async () => {
            const fileState: FileState = {
                selectedSignalRefs: [1],
                selectedSignalNames: ['sig'],
                visibleStart: 0,
                visibleEnd: 100,
                timelineCount: 1,
                timestamp: Date.now()
            };

            // Save with forward slashes
            await saveFileState('/path/to/test.vcd', fileState);
            
            // Load with backslashes - should normalize to forward slashes
            const loaded = await loadFileState('\\path\\to\\test.vcd');
            expect(loaded).not.toBeNull();
            expect(loaded?.selectedSignalRefs).toEqual([1]);
        });

        it('should return null for non-existent file state', async () => {
            const loaded = await loadFileState('nonexistent.vcd');
            expect(loaded).toBeNull();
        });

        it('should update timestamp when saving', async () => {
            const fileState: FileState = {
                selectedSignalRefs: [1],
                selectedSignalNames: ['sig'],
                visibleStart: 0,
                visibleEnd: 100,
                timelineCount: 1,
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
                selectedSignalRefs: [1, 2],
                selectedSignalNames: ['a', 'b'],
                visibleStart: 0,
                visibleEnd: 100,
                timelineCount: 1,
                timestamp: Date.now()
            };

            const state2: FileState = {
                selectedSignalRefs: [5, 6, 7],
                selectedSignalNames: ['x', 'y', 'z'],
                visibleStart: 500,
                visibleEnd: 1500,
                timelineCount: 2,
                timestamp: Date.now()
            };

            await saveFileState('file1.vcd', state1);
            await saveFileState('file2.vcd', state2);

            const loaded1 = await loadFileState('file1.vcd');
            const loaded2 = await loadFileState('file2.vcd');

            expect(loaded1?.selectedSignalRefs).toEqual([1, 2]);
            expect(loaded2?.selectedSignalRefs).toEqual([5, 6, 7]);
            expect(loaded1?.timelineCount).toBe(1);
            expect(loaded2?.timelineCount).toBe(2);
        });
    });

    describe('removeFileState', () => {
        it('should remove file state', async () => {
            const fileState: FileState = {
                selectedSignalRefs: [1],
                selectedSignalNames: ['sig'],
                visibleStart: 0,
                visibleEnd: 100,
                timelineCount: 1,
                timestamp: Date.now()
            };

            await saveFileState('test.vcd', fileState);
            expect(await loadFileState('test.vcd')).not.toBeNull();

            await removeFileState('test.vcd');
            expect(await loadFileState('test.vcd')).toBeNull();
        });

        it('should not affect other files when removing one', async () => {
            const state1: FileState = {
                selectedSignalRefs: [1],
                selectedSignalNames: ['a'],
                visibleStart: 0,
                visibleEnd: 100,
                timelineCount: 1,
                timestamp: Date.now()
            };

            const state2: FileState = {
                selectedSignalRefs: [2],
                selectedSignalNames: ['b'],
                visibleStart: 0,
                visibleEnd: 100,
                timelineCount: 1,
                timestamp: Date.now()
            };

            await saveFileState('file1.vcd', state1);
            await saveFileState('file2.vcd', state2);

            await removeFileState('file1.vcd');

            expect(await loadFileState('file1.vcd')).toBeNull();
            expect(await loadFileState('file2.vcd')).not.toBeNull();
        });
    });

    describe('clearAllFileStates', () => {
        it('should clear all file states', async () => {
            const state: FileState = {
                selectedSignalRefs: [1],
                selectedSignalNames: ['sig'],
                visibleStart: 0,
                visibleEnd: 100,
                timelineCount: 1,
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

    describe('error handling', () => {
        it('should handle localStorage errors gracefully', async () => {
            // Mock localStorage.setItem to throw
            const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
            setItemSpy.mockImplementation(() => {
                throw new Error('Storage quota exceeded');
            });

            const fileState: FileState = {
                selectedSignalRefs: [1],
                selectedSignalNames: ['sig'],
                visibleStart: 0,
                visibleEnd: 100,
                timelineCount: 1,
                timestamp: Date.now()
            };

            // Should not throw
            await expect(saveFileState('test.vcd', fileState)).resolves.not.toThrow();

            setItemSpy.mockRestore();
        });

        it('should handle JSON parse errors gracefully', async () => {
            // Corrupt the localStorage data
            localStorage.setItem('FileStates', 'invalid json{');

            // Should not throw and return null
            const loaded = await loadFileState('test.vcd');
            expect(loaded).toBeNull();
        });
    });
});
