/**
 * Dock Extension
 *
 * Provides the docking system for the application.
 * Manages the layout, tabs, and content areas.
 */

import { Extension } from "../types.js";
import { DockManager } from "./dock-manager.js";
import { DockLayoutHelper } from "../../components/dock-layout-helper.js";
import { DockLayout, DockBox, DockStack } from "./types.js";

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
    static readonly metadata = {
        id: 'core/dock',
        name: 'Dock Extension',
        description: 'Provides the docking system for managing layout and content',
    };

    private dockManager: DockManager | null = null;
    private dockLayoutHelper: DockLayoutHelper | null = null;
    private pendingContent: Array<[string, string, (id: string) => HTMLElement, boolean]> = [];

    constructor(dependencies: Map<string, Extension>) {}

    async activate(): Promise<DockAPI> {
        // The dock manager DOM element is created by app-main
        // This extension will manage the helpers once initialized
        return this;
    }

    /**
     * Get the dock manager instance
     */
    getDockManager(): DockManager | null {
        return this.dockManager;
    }

    /**
     * Get the dock layout helper instance
     */
    getDockLayoutHelper(): DockLayoutHelper | null {
        return this.dockLayoutHelper;
    }

    /**
     * Register content with the dock manager.
     * @param contentId Unique identifier for the content (also used as pane id)
     * @param title Display title for the pane tab
     * @param builder Factory function to create the content element
     * @param closable Whether the pane can be closed (default: true)
     *
     * If the dock is not yet initialized, the registration is queued
     * and applied once `initializeDockSystem` is called.
     */
    registerContent(contentId: string, title: string, builder: (id: string) => HTMLElement, closable: boolean = true): void {
        if (this.dockManager) {
            this.dockManager.registerContent(contentId, title, builder, closable);
        } else {
            this.pendingContent.push([contentId, title, builder, closable]);
        }
    }

    /**
     * Initialize the dock system with managers
     * Called by app-main after creating the dock-manager DOM element
     */
    initializeDockSystem(dockManager: DockManager): void {
        this.dockManager = dockManager;

        // Create the dock layout helper
        this.dockLayoutHelper = new DockLayoutHelper(dockManager);

        // Load default layout if none exists
        if (!this.dockManager.layout) {
            this.loadDefaultLayout();
        }

        // Flush any content that was registered before the dock was ready
        for (const [contentId, title, builder, closable] of this.pendingContent) {
            this.dockManager.registerContent(contentId, title, builder, closable);
        }
        this.pendingContent = [];
    }

    /**
     * Load the default layout
     */
    public loadDefaultLayout(): void {
        if (!this.dockManager) return;

        this.dockManager.layout = {
            root: {
                type: 'box',
                id: 'root',
                direction: 'row',
                weight: 100,
                children: [
                    {
                        type: 'stack',
                        id: 'main-stack',
                        weight: 80,
                        activeId: null,
                        children: []
                    }
                ]
            }
        };
    }
}
