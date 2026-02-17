/**
 * Undo Extension
 * 
 * Provides undo/redo functionality and undo tree visualization.
 * Contains the undo manager and exports an API for other extensions to use.
 */

import { Extension, ExtensionContext } from "../types.js";
import { UndoTreePanel } from "../../components/panels/undo-tree-panel.js";
import { UndoManager } from "../../undo/undo-manager.js";

// Ensure the custom element is registered
if (!customElements.get('undo-tree-panel')) {
    customElements.define('undo-tree-panel', UndoTreePanel);
}

/**
 * API provided by the undo extension
 */
export interface UndoAPI {
    /**
     * Get the undo manager instance
     */
    getUndoManager(): UndoManager;
}

export class UndoExtension implements Extension {
    readonly metadata = {
        id: 'core/undo',
        name: 'Undo Extension',
        description: 'Provides undo/redo functionality and history visualization',
        version: '1.0.0',
    };

    private undoManager: UndoManager;

    constructor() {
        this.undoManager = new UndoManager();
    }

    async activate(context: ExtensionContext): Promise<UndoAPI> {
        const paneManager = context.app.getPaneManager?.();
        const dockManager = context.app.getDockManager?.();

        if (!paneManager || !dockManager) {
            console.warn('Undo extension: Required managers not available');
            // Still return API even if UI can't be registered
            return {
                getUndoManager: () => this.undoManager,
            };
        }

        // Register the undo tree panel page
        context.registerPage({
            id: 'undo-tree',
            title: 'Undo History',
            icon: '↶',
            factory: () => {
                const undoTreePanel = new UndoTreePanel();
                undoTreePanel.id = 'undo-tree-panel';
                undoTreePanel.setUndoTree(this.undoManager.getUndoTree());
                return undoTreePanel;
            },
        });

        // Register content with dock manager
        dockManager.registerContent('undo-tree', () => {
            const undoTreePanel = new UndoTreePanel();
            undoTreePanel.id = 'undo-tree-panel';
            undoTreePanel.setUndoTree(this.undoManager.getUndoTree());
            return undoTreePanel;
        });

        // Register undo command
        context.registerCommand({
            id: 'core/edit/undo',
            label: 'Undo',
            description: 'Undo the last action',
            handler: () => {
                this.undoManager.undo();
            },
        });

        // Register redo command
        context.registerCommand({
            id: 'core/edit/redo',
            label: 'Redo',
            description: 'Redo the last undone action',
            handler: () => {
                this.undoManager.redo();
            },
        });

        // Register show undo tree command
        context.registerCommand({
            id: 'core/view/show-undo-tree',
            label: 'Show Undo Tree',
            description: 'Show the undo tree visualization',
            handler: () => {
                paneManager.activatePane('undo-tree-pane', 'Undo History', 'undo-tree', true);
            },
        });

        // Register toggle undo history command
        context.registerCommand({
            id: 'core/view/toggle-undo-history',
            label: 'Toggle Undo History View',
            description: 'Show or hide the undo history panel',
            handler: () => {
                paneManager.activatePane('undo-tree-pane', 'Undo History', 'undo-tree', true);
            },
        });

        // Register shortcuts
        context.registerShortcuts([
            {
                shortcut: 'Ctrl+Z',
                commandId: 'core/edit/undo',
            },
            {
                shortcut: 'Ctrl+Shift+Z',
                commandId: 'core/edit/redo',
            },
            {
                shortcut: 'Ctrl+Y',
                commandId: 'core/edit/redo',
            },
        ]);

        // Register menu items
        context.registerMenu({
            type: 'submenu',
            label: 'Edit',
            items: [
                {
                    type: 'item',
                    label: 'Undo',
                    action: 'core/edit/undo',
                },
                {
                    type: 'item',
                    label: 'Redo',
                    action: 'core/edit/redo',
                },
            ],
        });

        context.registerMenu({
            type: 'submenu',
            label: 'View',
            items: [
                {
                    type: 'item',
                    label: 'Undo History',
                    action: 'core/view/toggle-undo-history',
                },
            ],
        });

        // Return the API for other extensions to use
        return {
            getUndoManager: () => this.undoManager,
        };
    }
}
