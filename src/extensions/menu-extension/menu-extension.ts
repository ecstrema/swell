/**
 * Menu Extension
 * 
 * Provides the application menu bar.
 * Registers menu items from other extensions and displays them in the menu bar.
 */

import { Extension, ExtensionContext } from "../types.js";
import { MenuBar } from "./menu-bar.js";

// Ensure the custom element is registered
if (!customElements.get('app-menu-bar')) {
    customElements.define('app-menu-bar', MenuBar);
}

/**
 * API provided by the menu extension
 */
export interface MenuAPI {
    /**
     * Get the menu bar instance
     */
    getMenuBar(): MenuBar | null;
}

export class MenuExtension implements Extension {
    readonly metadata = {
        id: 'core/menu',
        name: 'Menu Extension',
        description: 'Provides the application menu bar',
    };

    private menuBar: MenuBar | null = null;

    async activate(context: ExtensionContext): Promise<MenuAPI> {
        // The menu bar is created by app-main, but we can provide an API to access it
        // The extension just ensures the custom element is registered
        
        return {
            getMenuBar: () => this.menuBar,
        };
    }

    /**
     * Set the menu bar instance (called by app-main after creating it)
     */
    setMenuBar(menuBar: MenuBar): void {
        this.menuBar = menuBar;
    }
}
