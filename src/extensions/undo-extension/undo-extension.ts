/**
 * Undo Extension
 *
 * Provides undo/redo functionality and undo tree visualization.
 * Contains the undo manager and exports an API for other extensions to use.
 */

import { Extension } from "../types.js";
import { UndoTreePanel } from "./undo-tree-panel.js";
import { UndoManager } from "./undo-manager.js";
import { DockExtension } from "../dock-extension/dock-extension.js";
import { CommandExtension } from "../command-extension/command-extension.js";
import { MenuExtension } from "../menu-extension/menu-extension.js";

// Re-export types that external code needs
export type { UndoableOperation } from "./undo-tree.js";
export { UndoManager } from "./undo-manager.js";

// Ensure the custom element is registered
if (!customElements.get('undo-tree-panel')) {
    customElements.define('undo-tree-panel', UndoTreePanel);
}

export class UndoExtension implements Extension {
    static readonly metadata = {
        id: 'core/undo',
        name: 'Undo Extension',
        description: 'Provides undo/redo functionality and history visualization',
    };
    static readonly dependencies = [DockExtension, CommandExtension, MenuExtension];

    private undoManager: UndoManager;
    private dockExtension: DockExtension;
    private commandExtension: CommandExtension;
    private menuExtension: MenuExtension;

    constructor(dependencies: Map<string, Extension>) {
        this.undoManager = new UndoManager();
        this.dockExtension = dependencies.get(DockExtension.metadata.id) as DockExtension;
        this.commandExtension = dependencies.get(CommandExtension.metadata.id) as CommandExtension;
        this.menuExtension = dependencies.get(MenuExtension.metadata.id) as MenuExtension;
    }

    getUndoManager(): UndoManager {
        return this.undoManager;
    }

    async activate(): Promise<void> {
        const dockManager = this.dockExtension.getDockManager();

        if (dockManager) {
            // Register content with dock manager
            dockManager.registerContent('undo-tree', () => {
                const undoTreePanel = new UndoTreePanel();
                undoTreePanel.id = 'undo-tree-panel';
                undoTreePanel.setUndoTree(this.undoManager.getUndoTree());
                return undoTreePanel;
            });
        } else {
            console.warn('Undo extension: Dock manager not available');
        }

        // Register undo command
        this.commandExtension.registerCommand({
            id: 'core/edit/undo',
            label: 'Undo',
            description: 'Undo the last action',
            handler: () => {
                this.undoManager.undo();
            },
        });

        // Register redo command
        this.commandExtension.registerCommand({
            id: 'core/edit/redo',
            label: 'Redo',
            description: 'Redo the last undone action',
            handler: () => {
                this.undoManager.redo();
            },
        });

        this.registerShowUndoTreeCommand();
        this.registerShortcuts();
        this.registerMenus();
    }

    private registerShowUndoTreeCommand(): void {
        this.commandExtension.registerCommand({
            id: 'core/view/show-undo-tree',
            label: 'Show Undo Tree',
            description: 'Show the undo tree visualization',
            handler: () => {
                const layoutHelper = this.dockExtension.getDockLayoutHelper();
                if (layoutHelper) {
                    layoutHelper.activatePane('undo-tree-pane', 'Undo History', 'undo-tree', true);
                }
            },
        });

        // Register toggle undo history command
        this.commandExtension.registerCommand({
            id: 'core/view/toggle-undo-history',
            label: 'Toggle Undo History View',
            description: 'Show or hide the undo history panel',
            handler: () => {
                const layoutHelper = this.dockExtension.getDockLayoutHelper();
                if (layoutHelper) {
                    layoutHelper.activatePane('undo-tree-pane', 'Undo History', 'undo-tree', true);
                }
            },
        });
    }

    private registerShortcuts(): void {
        // Register shortcuts
        this.commandExtension.registerShortcuts([
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
    }

    private registerMenus(): void {
        this.menuExtension.registerMenuItem('Edit/Undo', () => {
             this.undoManager.undo();
        }, { id: 'undo', commandId: 'core/edit/undo' });

        this.menuExtension.registerMenuItem('Edit/Redo', () => {
             this.undoManager.redo();
        }, { id: 'redo', commandId: 'core/edit/redo' });

        // View/Undo History is handled by CoreUIExtension which toggles it properly
        // But we can register a fallback or duplicate here if CoreUI is not active?
        // CoreUIExtension already registers 'View/Undo History' (toggle-undo-history)
        // So we might skip it here to avoid duplication or conflict.

        // However, this file has 'core/view/toggle-undo-history' command registered in `registerShowUndoTreeCommand`
        // which just activates the pane. `CoreUIExtension` has `toggle-undo-history-enhanced` which toggles it.

        // Let's remove the menu registration from here as it seems redundant/conflicting with CoreUI
        // or just register it if valid.
    }

    /**
     * Populate the undo tree with demo data to show branching
     * This demonstrates the branching undo functionality
     */
    private populateDemoUndoTree(): void {
        // Create demo operations that track state changes
        let demoState = { step: 0, value: 'Empty' };

        // Helper to create demo operations
        const createDemoOperation = (newStep: number, newValue: string, description: string) => {
            const oldStep = demoState.step;
            const oldValue = demoState.value;

            return {
                do: () => {
                    demoState = { step: newStep, value: newValue };
                    console.log(`Do: ${description}`, demoState);
                },
                undo: () => {
                    demoState = { step: oldStep, value: oldValue };
                    console.log(`Undo: ${description}`, demoState);
                },
                redo: () => {
                    demoState = { step: newStep, value: newValue };
                    console.log(`Redo: ${description}`, demoState);
                },
                getDescription: () => description
            };
        };

        // Create initial states
        this.undoManager.execute(createDemoOperation(1, 'Initial state', 'Initial state'));
        this.undoManager.execute(createDemoOperation(2, 'Added signal A', 'Add signal A'));
        this.undoManager.execute(createDemoOperation(3, 'Modified signal A', 'Modify signal A'));

        // Create a branch
        this.undoManager.undo();
        this.undoManager.execute(createDemoOperation(4, 'Added signal B', 'Add signal B'));

        // Create another branch
        this.undoManager.undo();
        this.undoManager.execute(createDemoOperation(5, 'Removed signal A', 'Remove signal A'));

        console.log('Demo undo tree populated with branching structure');
    }
}
