/**
 * Dock Extension
 * 
 * Provides the docking system for the application.
 * Manages the layout, tabs, and content areas.
 */

import { Extension, ExtensionContext } from "../types.js";
import { DockManager } from "./dock-manager.js";
import { DockLayoutHelper } from "../../components/dock-layout-helper.js";

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
    
    /**
     * Get the dock layout helper instance
     */
    getDockLayoutHelper(): DockLayoutHelper | null;
    
    /**
     * Initialize the dock system with the DOM element
     */
    initializeDockSystem(dockManager: DockManager): void;
}

export class DockExtension implements Extension {
    readonly metadata = {
        id: 'core/dock',
        name: 'Dock Extension',
        description: 'Provides the docking system for managing layout and content',
    };

    private dockManager: DockManager | null = null;
    private dockLayoutHelper: DockLayoutHelper | null = null;

    async activate(context: ExtensionContext): Promise<DockAPI> {
        // The dock manager DOM element is created by app-main
        // This extension will manage the helpers once initialized
        
        return {
            getDockManager: () => this.dockManager,
            getDockLayoutHelper: () => this.dockLayoutHelper,
            initializeDockSystem: (dockManager: DockManager) => this.initializeDockSystem(dockManager),
        };
    }

    /**
     * Initialize the dock system with managers
     * Called by app-main after creating the dock-manager DOM element
     */
    private initializeDockSystem(dockManager: DockManager): void {
        this.dockManager = dockManager;
        
        // Create the dock layout helper
        this.dockLayoutHelper = new DockLayoutHelper(dockManager);
    }
}
