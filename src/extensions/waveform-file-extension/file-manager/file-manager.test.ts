import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileManager } from './file-manager.js';

// mock backend helpers used by FileManager
vi.mock('../../../backend/index.js', () => ({
  addFile: vi.fn(async (f) => 'id1'),
  getFiles: vi.fn(async () => []),
  getHierarchy: vi.fn(async () => null),
  removeFile: vi.fn(async () => {}),
  openFileDialog: vi.fn(),
  isTauri: false
}));

import { addFile, getFiles, removeFile } from '../../../backend/index.js';

describe('FileManager', () => {
  let mgr: FileManager;

  beforeEach(() => {
    mgr = new FileManager();
    vi.clearAllMocks();
  });

  it('starts empty', () => {
    expect(mgr.getFileIds()).toEqual([]);
    expect(mgr.getActiveFileId()).toBeNull();
    expect(mgr.hasFile('foo')).toBe(false);
  });

  it('can open a file via handleFileOpen', async () => {
    vi.mocked(addFile).mockResolvedValueOnce('foo');
    const id = await mgr.handleFileOpen();
    expect(id).toBe('foo');
    expect(addFile).toHaveBeenCalled();
  });

  it('refreshFiles adds and removes files correctly', async () => {
    vi.mocked(getFiles).mockResolvedValue(['a', 'b']);
    const added: string[] = [];
    const removed: string[] = [];

    const result1 = await mgr.refreshFiles(async (id) => { added.push(id); }, (id) => { removed.push(id); });
    expect(added).toEqual(['a', 'b']);
    expect(result1.fileIds.sort()).toEqual(['a', 'b']);

    // simulate backend removal of 'a'
    vi.mocked(getFiles).mockResolvedValue(['b']);
    const result2 = await mgr.refreshFiles(undefined, (id) => removed.push(id));
    expect(removed).toContain('a');
    expect(result2.fileIds).toEqual(['b']);
  });

  it('getFileIdFromFilename resolves suffix matches', () => {
    // inject some resources directly
    (mgr as any).fileResources.set('/path/foo.vcd', { element: null, hierarchy: null });

    expect(mgr.getFileIdFromFilename('foo.vcd')).toBe('/path/foo.vcd');
    expect(mgr.getFileIdFromFilename('nonexistent')).toBeNull();
  });
});
