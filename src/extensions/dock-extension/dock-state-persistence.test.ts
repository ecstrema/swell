import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dockStatePersistence } from './dock-state-persistence.js';
import type { DockLayout } from './types.js';

// mock file-storage helpers
vi.mock('../../utils/app-file-storage.js', () => ({
    writeAppJSON: vi.fn(),
    readAppJSON: vi.fn(),
    appFileExists: vi.fn()
}));

import * as fileStorage from '../../utils/app-file-storage.js';

describe('DockStatePersistence', () => {
    const layout: DockLayout = {
        root: {
            type: 'stack',
            id: 'root',
            weight: 1,
            activeId: null,
            children: []
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('saves state using the file-storage wrapper', async () => {
        // call the private method via cast
        await (dockStatePersistence as any).saveStateImmediate(layout);
        expect(fileStorage.writeAppJSON).toHaveBeenCalled();
    });

    it('loads state using the file-storage wrapper', async () => {
        // simulate file present
        vi.mocked(fileStorage.readAppJSON).mockResolvedValue({ version: 0, root: layout.root });
        const result = await dockStatePersistence.loadState();
        expect(result).not.toBeNull();
        expect(result!.root).toEqual(layout.root);
    });
});
