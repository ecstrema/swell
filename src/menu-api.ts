// This file unifies the interface for creating menus between the web and native Tauri backends.

import { isTauri } from "./backend.js";

// Menu item types
export type MenuItemType = 'normal' | 'separator' | 'checkbox';

// Menu item definition
export interface MenuItemConfig {
    id?: string;
    text?: string;
    type?: MenuItemType;
    action?: () => void;
    checked?: boolean;
}

// Submenu definition
export interface SubmenuConfig {
    text: string;
    items: (MenuItemConfig | SubmenuConfig)[];
}

// Menu definition
export interface MenuConfig {
    items: (SubmenuConfig)[];
}

// Abstract menu item
export interface AbstractMenuItem {
    id?: string;
    text?: string;
    type: MenuItemType;
    checked?: boolean;
}

// Abstract submenu
export interface AbstractSubmenu {
    text: string;
    items: (AbstractMenuItem | AbstractSubmenu)[];
}

// Abstract menu
export interface AbstractMenu {
    items: AbstractSubmenu[];
}

/**
 * Creates a menu item
 * @param config - Configuration for the menu item
 * @returns Abstract representation of the menu item
 */
export async function createMenuItem(config: MenuItemConfig): Promise<AbstractMenuItem> {
    if (isTauri) {
        // Import Tauri menu APIs dynamically
        const { MenuItem } = await import('@tauri-apps/api/menu');
        
        if (config.type === 'separator') {
            // Tauri doesn't have a separator in MenuItem, so we return a marker
            return {
                type: 'separator'
            };
        }
        
        // Create native menu item
        await MenuItem.new({
            id: config.id,
            text: config.text,
            action: config.action
        });
        
        return {
            id: config.id,
            text: config.text,
            type: 'normal'
        };
    } else {
        // For web, just return the config as abstract representation
        return {
            id: config.id,
            text: config.text,
            type: config.type || 'normal'
        };
    }
}

/**
 * Creates a submenu
 * @param config - Configuration for the submenu with nested items
 * @returns Abstract representation of the submenu
 */
export async function createSubmenu(config: SubmenuConfig): Promise<AbstractSubmenu> {
    if (isTauri) {
        const { Submenu, MenuItem, PredefinedMenuItem } = await import('@tauri-apps/api/menu');
        
        // Build native menu items
        const nativeItems: any[] = [];
        for (const item of config.items) {
            if ('items' in item) {
                // It's a nested submenu
                const submenu = await createSubmenu(item as SubmenuConfig);
                // Create actual Tauri submenu
                const tauriSubmenu = await Submenu.new({
                    text: (item as SubmenuConfig).text,
                    items: [] // Will be populated recursively
                });
                nativeItems.push(tauriSubmenu);
            } else {
                // It's a menu item
                const menuItem = item as MenuItemConfig;
                if (menuItem.type === 'separator') {
                    nativeItems.push(await PredefinedMenuItem.new({ item: 'Separator' }));
                } else {
                    nativeItems.push(await MenuItem.new({
                        id: menuItem.id,
                        text: menuItem.text,
                        action: menuItem.action
                    }));
                }
            }
        }
        
        // Create the Tauri submenu with items
        await Submenu.new({
            text: config.text,
            items: nativeItems
        });
        
        // Return abstract representation
        const abstractItems: (AbstractMenuItem | AbstractSubmenu)[] = [];
        for (const item of config.items) {
            if ('items' in item) {
                abstractItems.push(await createSubmenu(item as SubmenuConfig));
            } else {
                abstractItems.push(await createMenuItem(item as MenuItemConfig));
            }
        }
        
        return {
            text: config.text,
            items: abstractItems
        };
    } else {
        // For web, build abstract representation recursively
        const abstractItems: (AbstractMenuItem | AbstractSubmenu)[] = [];
        for (const item of config.items) {
            if ('items' in item) {
                abstractItems.push(await createSubmenu(item as SubmenuConfig));
            } else {
                abstractItems.push(await createMenuItem(item as MenuItemConfig));
            }
        }
        
        return {
            text: config.text,
            items: abstractItems
        };
    }
}

/**
 * Creates a menu and sets it as the application menu (in Tauri mode)
 * @param config - Configuration for the menu with top-level submenus
 * @returns Abstract representation of the menu
 * @note Currently supports one level of nested submenus. Deep nesting beyond this may not work consistently.
 */
export async function createMenu(config: MenuConfig): Promise<AbstractMenu> {
    if (isTauri) {
        const { Menu, Submenu, MenuItem, PredefinedMenuItem } = await import('@tauri-apps/api/menu');
        
        // Build native submenus
        const nativeSubmenus: any[] = [];
        for (const submenuConfig of config.items) {
            // Build items for this submenu
            const nativeItems = [];
            for (const item of submenuConfig.items) {
                if ('items' in item) {
                    // Nested submenu - handle recursively
                    const nestedConfig = item as SubmenuConfig;
                    const nestedNativeItems: any[] = [];
                    for (const nestedItem of nestedConfig.items) {
                        if ('items' in nestedItem) {
                            // Even deeper nesting - for now, skip or handle
                            console.warn('Deep nesting not fully supported yet');
                        } else {
                            const menuItem = nestedItem as MenuItemConfig;
                            if (menuItem.type === 'separator') {
                                nestedNativeItems.push(await PredefinedMenuItem.new({ item: 'Separator' }));
                            } else {
                                nestedNativeItems.push(await MenuItem.new({
                                    id: menuItem.id,
                                    text: menuItem.text,
                                    action: menuItem.action
                                }));
                            }
                        }
                    }
                    nativeItems.push(await Submenu.new({
                        text: nestedConfig.text,
                        items: nestedNativeItems
                    }));
                } else {
                    const menuItem = item as MenuItemConfig;
                    if (menuItem.type === 'separator') {
                        nativeItems.push(await PredefinedMenuItem.new({ item: 'Separator' }));
                    } else {
                        nativeItems.push(await MenuItem.new({
                            id: menuItem.id,
                            text: menuItem.text,
                            action: menuItem.action
                        }));
                    }
                }
            }
            
            nativeSubmenus.push(await Submenu.new({
                text: submenuConfig.text,
                items: nativeItems
            }));
        }
        
        // Create and set the menu
        const menu = await Menu.new({
            items: nativeSubmenus
        });
        
        await menu.setAsAppMenu();
        
        // Return abstract representation
        const abstractSubmenus: AbstractSubmenu[] = [];
        for (const submenuConfig of config.items) {
            abstractSubmenus.push(await createSubmenu(submenuConfig));
        }
        
        return {
            items: abstractSubmenus
        };
    } else {
        // For web, just build the abstract representation
        const abstractSubmenus: AbstractSubmenu[] = [];
        for (const submenuConfig of config.items) {
            abstractSubmenus.push(await createSubmenu(submenuConfig));
        }
        
        return {
            items: abstractSubmenus
        };
    }
}
