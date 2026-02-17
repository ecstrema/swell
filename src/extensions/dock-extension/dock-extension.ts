/**
 * Dock Extension
 * 
 * Provides the docking system for the application.
 * Manages the layout, tabs, and content areas.
 */

import { Extension, ExtensionContext } from "../types.js";
import { DockManager } from "./dock-manager.js";

// Ensure custom elements are registered
import "./dock-manager.js";
import "./dock-stack.js";
import "./dock-box.js";

/**
 * API provided by the dock extension
 */
export interface DockAPI {
    /**
     * Get the dock manager instance
     */
    getDockManager(): DockManager | null;
}

export class DockExtension implements Extension {
    readonly metadata = {
        id: 'core/dock',
        name: 'Dock Extension',
        description: 'Provides the docking system for managing layout and content',
    };

    private dockManager: DockManager | null = null;

    async activate(context: ExtensionContext): Promise<DockAPI> {
        // The dock manager is created by app-main
        // This extension ensures the custom elements are registered
        
        return {
            getDockManager: () => this.dockManager,
        };
    }

    /**
     * Set the dock manager instance (called by app-main after creating it)
     */
    setDockManager(dockManager: DockManager): void {
        this.dockManager = dockManager;
    }
}
