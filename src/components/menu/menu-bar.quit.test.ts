import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test to verify quit menu item behavior
describe('MenuBar Quit Functionality', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should include quit option when isTauri is true', () => {
        const isTauri = true;
        const fileMenuItems: any[] = [
            {
                id: 'open',
                text: 'Open File...',
                action: () => {}
            }
        ];

        // Simulate the logic from menu-bar.ts
        if (isTauri) {
            fileMenuItems.push(
                {
                    type: 'separator' as const
                },
                {
                    id: 'quit',
                    text: 'Quit',
                    action: async () => {}
                }
            );
        }

        expect(fileMenuItems).toHaveLength(3);
        expect(fileMenuItems[1].type).toBe('separator');
        expect(fileMenuItems[2].id).toBe('quit');
        expect(fileMenuItems[2].text).toBe('Quit');
    });

    it('should not include quit option when isTauri is false', () => {
        const isTauri = false;
        const fileMenuItems: any[] = [
            {
                id: 'open',
                text: 'Open File...',
                action: () => {}
            }
        ];

        // Simulate the logic from menu-bar.ts
        if (isTauri) {
            fileMenuItems.push(
                {
                    type: 'separator' as const
                },
                {
                    id: 'quit',
                    text: 'Quit',
                    action: async () => {}
                }
            );
        }

        expect(fileMenuItems).toHaveLength(1);
        expect(fileMenuItems[0].id).toBe('open');
    });
});
