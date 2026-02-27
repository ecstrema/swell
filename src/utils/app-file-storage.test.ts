import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fsWrapper from './app-file-storage.js';

// web branch (IndexedDB)
vi.mock('../backend/index.js', () => ({ isTauri: false }));

describe('app-file-storage (web / IndexedDB)', () => {
    beforeEach(async () => {
        // clear the database used by the module
        await new Promise<void>((res) => {
            const req = indexedDB.deleteDatabase('swell-app-files');
            req.onsuccess = req.onblocked = () => res();
            req.onerror = () => res();
        });
    });

    it('write/read/delete/existence cycle', async () => {
        expect(await fsWrapper.appFileExists('foo')).toBe(false);
        await fsWrapper.writeAppFile('foo', 'bar');
        expect(await fsWrapper.appFileExists('foo')).toBe(true);
        expect(await fsWrapper.readAppFile('foo')).toBe('bar');
        await fsWrapper.deleteAppFile('foo');
        expect(await fsWrapper.appFileExists('foo')).toBe(false);
    });

    it('json helpers work', async () => {
        await fsWrapper.writeAppJSON('a.json', { x: 1 });
        const obj = await fsWrapper.readAppJSON<{ x: number }>('a.json');
        expect(obj).toEqual({ x: 1 });
    });
});

// tauri branch tests
vi.mock('../backend/index.js', () => ({ isTauri: true }));

describe('app-file-storage (tauri fs)', () => {
    beforeEach(async () => {
        // fake the fs API
        vi.mock('@tauri-apps/api/fs', () => ({
            writeTextFile: vi.fn().mockResolvedValue(undefined),
            readTextFile: vi.fn().mockResolvedValue('hi'),
            removeFile: vi.fn().mockResolvedValue(undefined),
            exists: vi.fn().mockResolvedValue(true),
            BaseDirectory: { App: 'App' }
        }));
    });

    it('delegates to @tauri-apps/api/fs', async () => {
        const { writeTextFile, readTextFile, removeFile, exists } = await import('@tauri-apps/api/fs');

        await fsWrapper.writeAppFile('p.txt', 'hello');
        expect(writeTextFile).toHaveBeenCalledWith({ path: 'p.txt', contents: 'hello', dir: expect.anything() });

        const txt = await fsWrapper.readAppFile('p.txt');
        expect(readTextFile).toHaveBeenCalled();
        expect(txt).toBe('hi');

        await fsWrapper.deleteAppFile('p.txt');
        expect(removeFile).toHaveBeenCalled();

        const existsResult = await fsWrapper.appFileExists('p.txt');
        expect(exists).toHaveBeenCalled();
        expect(existsResult).toBe(true);
    });
});
