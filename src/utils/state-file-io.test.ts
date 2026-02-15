import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveStateToFile, loadStateFromFile } from './state-file-io';
import type { FileState } from './file-state-storage';

// Mock the backend module
vi.mock('../backend.js', () => ({
    isTauri: false,
    saveStateFileDialog: vi.fn(),
    openStateFileDialog: vi.fn(),
    writeTextFile: vi.fn(),
    readTextFile: vi.fn()
}));

describe('state-file-io', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('saveStateToFile', () => {
        it('should create app state with correct structure', async () => {
            const { saveStateFileDialog, writeTextFile } = await import('../backend.js');
            
            // Mock dialog to return a path
            vi.mocked(saveStateFileDialog).mockResolvedValue('test.swellstate');
            
            const state: FileState = {
                version: 'V0.1',
                items: [
                    { _type: 'timeline', name: 'Timeline 1' },
                    { _type: 'signal', ref: 1, name: 'clk' }
                ],
                visibleStart: 0,
                visibleEnd: 1000,
                timestamp: Date.now()
            };

            await saveStateToFile('test.vcd', state);

            expect(saveStateFileDialog).toHaveBeenCalledWith('test.swellstate');
            expect(writeTextFile).toHaveBeenCalledWith('test.swellstate', expect.stringContaining('"version": "V0.1"'));
            expect(writeTextFile).toHaveBeenCalledWith('test.swellstate', expect.stringContaining('"filename": "test.vcd"'));
        });

        it('should handle user cancellation', async () => {
            const { saveStateFileDialog, writeTextFile } = await import('../backend.js');
            
            // Mock dialog to return null (user cancelled)
            vi.mocked(saveStateFileDialog).mockResolvedValue(null);
            
            const state: FileState = {
                version: 'V0.1',
                items: [],
                visibleStart: 0,
                visibleEnd: 1000,
                timestamp: Date.now()
            };

            await saveStateToFile('test.vcd', state);

            expect(saveStateFileDialog).toHaveBeenCalled();
            expect(writeTextFile).not.toHaveBeenCalled();
        });

        it('should derive default filename from waveform filename', async () => {
            const { saveStateFileDialog } = await import('../backend.js');
            
            vi.mocked(saveStateFileDialog).mockResolvedValue('test.swellstate');
            
            const state: FileState = {
                version: 'V0.1',
                items: [],
                visibleStart: 0,
                visibleEnd: 1000,
                timestamp: Date.now()
            };

            await saveStateToFile('example.vcd', state);

            expect(saveStateFileDialog).toHaveBeenCalledWith('example.swellstate');
        });
    });

    describe('loadStateFromFile', () => {
        it('should load and parse state file correctly', async () => {
            const { openStateFileDialog, readTextFile } = await import('../backend.js');
            
            const mockFile = new File(['content'], 'test.swellstate');
            vi.mocked(openStateFileDialog).mockResolvedValue(mockFile);
            
            const mockContent = JSON.stringify({
                version: 'V0.1',
                filename: 'test.vcd',
                state: {
                    version: 'V0.1',
                    items: [
                        { _type: 'timeline', name: 'Timeline 1' },
                        { _type: 'signal', ref: 1, name: 'clk' }
                    ],
                    visibleStart: 0,
                    visibleEnd: 1000,
                    timestamp: Date.now()
                }
            });
            
            vi.mocked(readTextFile).mockResolvedValue(mockContent);

            const result = await loadStateFromFile();

            expect(result).not.toBeNull();
            expect(result?.filename).toBe('test.vcd');
            expect(result?.state.items).toHaveLength(2);
        });

        it('should handle user cancellation', async () => {
            const { openStateFileDialog, readTextFile } = await import('../backend.js');
            
            vi.mocked(openStateFileDialog).mockResolvedValue(null);

            const result = await loadStateFromFile();

            expect(result).toBeNull();
            expect(readTextFile).not.toHaveBeenCalled();
        });

        it('should validate state file format', async () => {
            const { openStateFileDialog, readTextFile } = await import('../backend.js');
            
            const mockFile = new File(['content'], 'test.swellstate');
            vi.mocked(openStateFileDialog).mockResolvedValue(mockFile);
            
            // Invalid format - missing required fields
            const mockContent = JSON.stringify({
                version: 'V0.1'
                // Missing filename and state
            });
            
            vi.mocked(readTextFile).mockResolvedValue(mockContent);

            await expect(loadStateFromFile()).rejects.toThrow('Invalid state file format');
        });

        it('should handle JSON parse errors', async () => {
            const { openStateFileDialog, readTextFile } = await import('../backend.js');
            
            const mockFile = new File(['content'], 'test.swellstate');
            vi.mocked(openStateFileDialog).mockResolvedValue(mockFile);
            
            vi.mocked(readTextFile).mockResolvedValue('invalid json{');

            await expect(loadStateFromFile()).rejects.toThrow();
        });
    });
});
