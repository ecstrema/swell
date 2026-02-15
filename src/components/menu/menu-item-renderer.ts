/**
 * Shared menu item renderer used by both MenuBar and ContextMenu
 * Provides consistent rendering logic for menu items, separators, and submenus
 */

import { MenuItemConfig, SubmenuConfig } from "../../menu-api.js";
import { ShortcutManager } from "../../shortcuts/index.js";

export interface MenuItemElement {
    element: HTMLElement;
    id?: string;
    action?: () => void;
    disabled?: boolean;
}

/**
 * ContextMenu-style item definition for backward compatibility
 * This allows ContextMenu to maintain its existing API
 */
export interface ContextMenuItem {
    id: string;
    label: string;
    disabled?: boolean;
    separator?: boolean;
    handler?: () => void;
}

/**
 * Renders a list of menu items to HTML elements
 * @param items Array of menu items or submenus to render
 * @param options Rendering options
 * @returns Array of rendered menu item elements with associated metadata
 */
export function renderMenuItems(
    items: (MenuItemConfig | SubmenuConfig)[],
    options: {
        isSubmenu?: boolean;
        onItemClick?: (id: string) => void;
        shortcutManager?: ShortcutManager;
        commandIdMapper?: (menuItemId: string) => string | undefined;
    } = {}
): MenuItemElement[] {
    const elements: MenuItemElement[] = [];

    items.forEach((item) => {
        if ('items' in item) {
            // Nested submenu
            const submenu = item as SubmenuConfig;
            const submenuElement = document.createElement('div');
            submenuElement.className = 'menu-submenu';
            
            const titleElement = document.createElement('div');
            titleElement.className = 'submenu-title';
            titleElement.textContent = submenu.text;
            
            const arrow = document.createElement('span');
            arrow.className = 'submenu-arrow';
            arrow.textContent = '▶';
            titleElement.appendChild(arrow);
            
            const dropdownElement = document.createElement('div');
            dropdownElement.className = 'submenu-dropdown';
            
            // Recursively render submenu items
            const submenuItems = renderMenuItems(submenu.items, { ...options, isSubmenu: true });
            submenuItems.forEach(({ element }) => {
                dropdownElement.appendChild(element);
            });
            
            submenuElement.appendChild(titleElement);
            submenuElement.appendChild(dropdownElement);
            
            elements.push({ element: submenuElement });
        } else if (item.type === 'separator') {
            // Separator
            const separator = document.createElement('div');
            separator.className = options.isSubmenu ? 'menu-separator' : 'separator';
            elements.push({ element: separator });
        } else {
            // Regular menu item
            const menuItem = item as MenuItemConfig;
            const menuItemElement = document.createElement('div');
            menuItemElement.className = 'menu-item';
            
            // Create label span
            const labelSpan = document.createElement('span');
            labelSpan.className = 'menu-item-label';
            labelSpan.textContent = menuItem.text ?? '';
            menuItemElement.appendChild(labelSpan);
            
            // Add shortcut if available
            if (menuItem.id && options.shortcutManager && options.commandIdMapper) {
                const commandId = options.commandIdMapper(menuItem.id);
                if (commandId) {
                    const shortcuts = options.shortcutManager.getShortcutsForCommand(commandId);
                    if (shortcuts.length > 0) {
                        const shortcutSpan = document.createElement('span');
                        shortcutSpan.className = 'menu-item-shortcut';
                        // Replace "Control" with "Ctrl" for shorter display
                        const formattedShortcut = ShortcutManager.formatShortcut(shortcuts[0]).replaceAll('Control', 'Ctrl');
                        shortcutSpan.textContent = formattedShortcut;
                        menuItemElement.appendChild(shortcutSpan);
                    }
                }
            }
            
            if (menuItem.id) {
                menuItemElement.dataset.id = menuItem.id;
            }
            
            elements.push({
                element: menuItemElement,
                id: menuItem.id,
                action: menuItem.action
            });
        }
    });

    return elements;
}

/**
 * Finds and executes an action for a menu item by ID
 * @param itemId The ID of the menu item to find
 * @param items The list of items to search through
 * @returns true if the action was found and executed, false otherwise
 */
export function findAndExecuteAction(
    itemId: string,
    items: (MenuItemConfig | SubmenuConfig)[]
): boolean {
    for (const item of items) {
        if ('items' in item) {
            // Recursively search in nested submenu
            const submenu = item as SubmenuConfig;
            if (findAndExecuteAction(itemId, submenu.items)) {
                return true;
            }
        } else {
            const menuItem = item as MenuItemConfig;
            if (menuItem.id === itemId && menuItem.action) {
                menuItem.action();
                return true;
            }
        }
    }
    return false;
}

/**
 * Converts ContextMenu-style items to MenuItemConfig format
 * This allows ContextMenu to use the unified menu API types
 * Note: MenuItemConfig doesn't have a disabled field, so we return
 * a map of disabled states for the caller to apply after rendering
 */
export function convertContextMenuItems(
    items: ContextMenuItem[]
): { menuItems: MenuItemConfig[]; disabledIds: Set<string> } {
    const menuItems: MenuItemConfig[] = [];
    const disabledIds = new Set<string>();

    items.forEach(item => {
        if (item.separator) {
            menuItems.push({
                type: 'separator' as const
            });
        } else {
            menuItems.push({
                id: item.id,
                text: item.label,
                action: item.handler,
            });
            if (item.disabled) {
                disabledIds.add(item.id);
            }
        }
    });

    return { menuItems, disabledIds };
}
