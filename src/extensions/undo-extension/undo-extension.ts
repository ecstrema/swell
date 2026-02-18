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
import { SettingsExtension } from "../settings-extension/settings-extension.js";

const SETTING_UNDO_HISTORY_VISIBLE = 'Interface/Undo History Visible';

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
    static readonly dependencies = [DockExtension, CommandExtension, MenuExtension, SettingsExtension];

    private undoManager: UndoManager;
    private dockExtension: DockExtension;
    private commandExtension: CommandExtension;
    private menuExtension: MenuExtension;
    private settingsExtension: SettingsExtension;

    constructor(dependencies: Map<string, Extension>) {
        this.undoManager = new UndoManager();
        this.dockExtension = dependencies.get(DockExtension.metadata.id) as DockExtension;
        this.commandExtension = dependencies.get(CommandExtension.metadata.id) as CommandExtension;
        this.menuExtension = dependencies.get(MenuExtension.metadata.id) as MenuExtension;
        this.settingsExtension = dependencies.get(SettingsExtension.metadata.id) as SettingsExtension;
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
        this.registerMenus();
    }

    private registerShowUndoTreeCommand(): void {
        this.commandExtension.registerCommand({
            id: 'core/view/toggle-undo-history',
            label: 'Toggle Undo History',
            description: 'Show or hide the undo history panel',
            handler: () => {
                this.toggleUndoHistory();
            },
        });
    }

    private async toggleUndoHistory(): Promise<void> {
        const layoutHelper = this.dockExtension.getDockLayoutHelper();
        if (!layoutHelper) return;

        const newVisibility = layoutHelper.toggleUndoPaneVisibility();

        // Update the menu checkbox state
        this.menuExtension.updateMenuItem('toggle-undo-history', { checked: newVisibility });

        // Persist the setting
        try {
            await this.settingsExtension.setSetting(SETTING_UNDO_HISTORY_VISIBLE, newVisibility);
        } catch (error) {
            console.warn('Failed to persist undo history visibility setting:', error);
        }
    }

    private registerMenus(): void {
        this.menuExtension.registerMenuItem('Edit/Undo', () => {
             this.undoManager.undo();
        }, { id: 'undo', commandId: 'core/edit/undo' });

        this.menuExtension.registerMenuItem('Edit/Redo', () => {
             this.undoManager.redo();
        }, { id: 'redo', commandId: 'core/edit/redo' });

        this.menuExtension.registerMenuItem('View/Undo History', () => {
             this.commandExtension.execute('core/view/toggle-undo-history');
        }, {
             type: 'checkbox',
             checked: false, // Initial state, should be updated from persistence if possible
             id: 'toggle-undo-history',
             commandId: 'core/view/toggle-undo-history'
        });
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
