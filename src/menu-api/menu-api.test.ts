import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMenu, createSubmenu, createMenuItem, MenuConfig, SubmenuConfig, MenuItemConfig } from './menu-api.js';

// Mock the backend module to avoid WASM dependency
vi.mock('../backend/index.js', () => ({
    isTauri: false
}));

// Mock the WASM backend module
vi.mock('../../backend/pkg/backend', () => ({
    default: vi.fn(),
    add_file_bytes: vi.fn(),
    get_files: vi.fn(),
    remove_file: vi.fn(),
    get_hierarchy: vi.fn(),
}));

// Mock the Tauri menu APIs
vi.mock('@tauri-apps/api/menu', () => ({
    Menu: {
        new: vi.fn().mockResolvedValue({
            setAsAppMenu: vi.fn().mockResolvedValue(undefined)
        })
    },
    Submenu: {
        new: vi.fn().mockResolvedValue({})
    },
    MenuItem: {
        new: vi.fn().mockResolvedValue({})
    },
    PredefinedMenuItem: {
        new: vi.fn().mockResolvedValue({})
    }
}));

describe('Menu API', () => {
    describe('Web Mode', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('should create a menu item in web mode', async () => {
            const config: MenuItemConfig = {
                id: 'test-item',
                text: 'Test Item',
                action: () => console.log('test')
            };

            const result = await createMenuItem(config);

            expect(result).toEqual({
                id: 'test-item',
                text: 'Test Item',
                type: 'normal'
            });
        });

        it('should create a separator in web mode', async () => {
            const config: MenuItemConfig = {
                type: 'separator'
            };

            const result = await createMenuItem(config);

            expect(result).toEqual({
                type: 'separator'
            });
        });

        it('should create a submenu in web mode', async () => {
            const config: SubmenuConfig = {
                text: 'Test Submenu',
                items: [
                    {
                        id: 'item-1',
                        text: 'Item 1',
                        action: () => {}
                    },
                    {
                        type: 'separator'
                    },
                    {
                        id: 'item-2',
                        text: 'Item 2',
                        action: () => {}
                    }
                ]
            };

            const result = await createSubmenu(config);

            expect(result.text).toBe('Test Submenu');
            expect(result.items).toHaveLength(3);
            expect(result.items[0]).toEqual({
                id: 'item-1',
                text: 'Item 1',
                type: 'normal'
            });
            expect(result.items[1]).toEqual({
                type: 'separator'
            });
            expect(result.items[2]).toEqual({
                id: 'item-2',
                text: 'Item 2',
                type: 'normal'
            });
        });

        it('should create a full menu in web mode', async () => {
            const config: MenuConfig = {
                items: [
                    {
                        text: 'File',
                        items: [
                            {
                                id: 'open',
                                text: 'Open',
                                action: () => {}
                            },
                            {
                                type: 'separator'
                            },
                            {
                                id: 'quit',
                                text: 'Quit',
                                action: () => {}
                            }
                        ]
                    },
                    {
                        text: 'Edit',
                        items: [
                            {
                                id: 'undo',
                                text: 'Undo',
                                action: () => {}
                            }
                        ]
                    }
                ]
            };

            const result = await createMenu(config);

            expect(result.items).toHaveLength(2);
            expect(result.items[0].text).toBe('File');
            expect(result.items[0].items).toHaveLength(3);
            expect(result.items[1].text).toBe('Edit');
            expect(result.items[1].items).toHaveLength(1);
        });

        it('should handle nested submenus', async () => {
            const config: SubmenuConfig = {
                text: 'Parent',
                items: [
                    {
                        text: 'Child',
                        items: [
                            {
                                id: 'grandchild',
                                text: 'Grandchild',
                                action: () => {}
                            }
                        ]
                    }
                ]
            };

            const result = await createSubmenu(config);

            expect(result.text).toBe('Parent');
            expect(result.items).toHaveLength(1);
            expect('items' in result.items[0]).toBe(true);
            if ('items' in result.items[0]) {
                expect(result.items[0].text).toBe('Child');
                expect(result.items[0].items).toHaveLength(1);
            }
        });
    });
});
