/**
 * Menu Extension
 *
 * Provides the application menu bar.
 * Registers menu items from other extensions and displays them in the menu bar.
 */

import { Extension } from "../types.js";
import { MenuBar } from "./menu-bar.js";
import { MenuConfig, MenuItemType, MenuItemConfig, SubmenuConfig } from "../../menu-api/index.js";

// Ensure the custom element is registered
if (!customElements.get('app-menu-bar')) {
    customElements.define('app-menu-bar', MenuBar);
}

export interface MenuItemOptions {
    id?: string;
    type?: MenuItemType;
    checked?: boolean;
    commandId?: string; // Optional: map to a command ID for shortcuts
}

export class MenuExtension implements Extension {
    static readonly metadata = {
        id: 'core/menu',
        name: 'Menu Extension',
        description: 'Provides the application menu bar',
    };

    private menuBar: MenuBar | null = null;
    private registrations: { path: string, action?: () => void, options: MenuItemOptions }[] = [];
    private pendingUpdate: number | null = null;

    constructor(dependencies: Map<string, Extension>) {}

    async activate(): Promise<MenuExtension> {
        return this;
    }

    /**
     * Get the menu bar instance
     */
    getMenuBar(): MenuBar | null {
        return this.menuBar;
    }

    /**
     * Register a menu item
     * @param path Menu path (e.g. "File/Open")
     * @param action Callback function when item is clicked
     * @param options Additional options
     */
    registerMenuItem(path: string, action?: () => void, options: MenuItemOptions = {}): void {
        this.registrations.push({ path, action, options });
        this.documentRebuild();
    }

    /**
     * Set the menu bar instance (called by app-main after creating it)
     */
    setMenuBar(menuBar: MenuBar): void {
        this.menuBar = menuBar;
        this.documentRebuild(); // Initial build
    }

    private documentRebuild() {
        if (this.pendingUpdate) cancelAnimationFrame(this.pendingUpdate);
        this.pendingUpdate = requestAnimationFrame(() => this.rebuildMenu());
    }

    /**
     * Update a menu item state
     */
    updateMenuItem(id: string, updates: Partial<MenuItemOptions>): void {
        const reg = this.registrations.find(r => r.options.id === id);
        if (reg) {
            Object.assign(reg.options, updates);
        }

        if (this.menuBar && updates.checked !== undefined) {
             this.menuBar.updateMenuItemChecked(id, updates.checked);
        }
    }

    private rebuildMenu() {
        if (!this.menuBar) return;

        const root: MenuConfig = { items: [] };
        const commandMappings: Record<string, string> = {};

        // Helper to find or create submenu
        const findOrCreateSubmenu = (parentItems: (SubmenuConfig | MenuItemConfig)[], text: string): SubmenuConfig => {
            let sub = parentItems.find(p => 'items' in p && p.text === text) as SubmenuConfig;
            if (!sub) {
                sub = { text, items: [] };
                parentItems.push(sub);
            }
            return sub;
        };

        for (const reg of this.registrations) {
            const parts = reg.path.split('/');
            const label = parts.pop();
            if (!label) continue;

            let currentItems: (SubmenuConfig | MenuItemConfig)[] = root.items;

            // Navigate to parent submenu
            for (const part of parts) {
                const sub = findOrCreateSubmenu(currentItems, part);
                currentItems = sub.items;
            }

            // Create item
            if (reg.options.type === 'separator' || label === '-') {
                currentItems.push({ type: 'separator' } as MenuItemConfig);
            } else {
                currentItems.push({
                    text: label,
                    action: reg.action,
                    id: reg.options.id,
                    type: reg.options.type || 'normal',
                    checked: reg.options.checked
                } as MenuItemConfig);
            }

            if (reg.options.id && reg.options.commandId) {
                commandMappings[reg.options.id] = reg.options.commandId;
            }
        }

        this.menuBar.setMenuConfig(root);
        this.menuBar.setCommandMappings(commandMappings);
    }
}
