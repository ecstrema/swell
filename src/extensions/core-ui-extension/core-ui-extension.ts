/**
 * Core UI Extension
 *
 * Manages UI coordination and view commands.
 * Handles netlist visibility and theme updates.
 */

import { Extension } from "../types.js";
import { DockExtension } from "../dock-extension/dock-extension.js";
import { CommandExtension } from "../command-extension/command-extension.js";
import { MenuExtension } from "../menu-extension/menu-extension.js";

// Setting paths
const SETTING_NETLIST_VISIBLE = 'Interface/Netlist Visible';
const SETTING_UNDO_HISTORY_VISIBLE = 'Interface/Undo History Visible';

export class CoreUIExtension implements Extension {
    static readonly metadata = {
        id: 'core/ui',
        name: 'Core UI Extension',
        description: 'Manages UI coordination and view commands',
    };
    static readonly dependencies = [DockExtension, CommandExtension, MenuExtension];

    private dockExtension: DockExtension;
    private commandExtension: CommandExtension;
    private menuExtension: MenuExtension;

    constructor(dependencies: Map<string, Extension>) {
        this.dockExtension = dependencies.get(DockExtension.metadata.id) as DockExtension;
        this.commandExtension = dependencies.get(CommandExtension.metadata.id) as CommandExtension;
        this.menuExtension = dependencies.get(MenuExtension.metadata.id) as MenuExtension;
    }

    async activate(): Promise<void> {
        // Register netlist toggle command
        this.registerNetlistToggleCommand();

        // Register undo history toggle (enhanced version that also handles sidebar)
        this.registerUndoHistoryToggleCommand();

        // Register quit command (Tauri only)
        this.registerQuitCommand();
    }

    /**
     * Register netlist toggle command
     */
    private registerNetlistToggleCommand(): void {
        this.commandExtension.registerCommand({
            id: 'core/view/toggle-netlist',
            label: 'Toggle Netlist View',
            description: 'Show or hide the netlist/hierarchy view',
            handler: () => this.toggleNetlist(),
        });

        this.commandExtension.registerShortcut({
            shortcut: 'Ctrl+Shift+H',
            commandId: 'core/view/toggle-netlist',
        });

        this.menuExtension.registerMenuItem('View/-', undefined, { type: 'separator' });
        this.menuExtension.registerMenuItem('View/Toggle Netlist', () => {
             this.toggleNetlist();
        }, {
             type: 'checkbox',
             checked: true,
             id: 'toggle-netlist',
             commandId: 'core/view/toggle-netlist'
        });
    }

    /**
     * Register enhanced undo history toggle command
     */
    private registerUndoHistoryToggleCommand(): void {
        // Note: Basic undo history is already registered in UndoExtension
        // This adds the enhanced version that also handles sidebar visibility
        this.commandExtension.registerCommand({
            id: 'core/view/toggle-undo-history-enhanced',
            label: 'Toggle Undo History (Enhanced)',
            description: 'Toggle undo history visibility with sidebar management',
            handler: () => this.toggleUndoHistory(),
        });
    }

    /**
     * Register quit command (Tauri only)
     */
    private registerQuitCommand(): void {
        this.commandExtension.registerCommand({
            id: 'core/file/quit',
            label: 'Quit',
            description: 'Quit the application',
            handler: async () => {
                // Only available in Tauri
                const { isTauri } = await import('../../backend/index.js');
                if (isTauri) {
                    const { getCurrentWindow } = await import('@tauri-apps/api/window');
                    await getCurrentWindow().close();
                }
            },
        });

        // Register shortcut
        this.commandExtension.registerShortcut({
            shortcut: 'Ctrl+Q',
            commandId: 'core/file/quit',
        });

        // Register menu item
        this.menuExtension.registerMenuItem('File/-', undefined, { type: 'separator' });
        this.menuExtension.registerMenuItem('File/Quit', () => {
             this.commandExtension.executeCommand('core/file/quit');
        });
    }

    /**
     * Toggle the netlist view visibility
     */
    private async toggleNetlist(): Promise<void> {
        const layoutHelper = this.dockExtension.getDockLayoutHelper();
        if (!layoutHelper) return;

        const newVisibility = layoutHelper.toggleSidebarVisibility();

        // Update the menu checkbox state
        this.menuExtension.updateMenuItem('toggle-netlist', { checked: newVisibility });

        // Persist the setting
        try {
            const { setSetting } = await import('../settings-extension/settings-extension.js');
            await setSetting(SETTING_NETLIST_VISIBLE, newVisibility);
        } catch (error) {
            console.warn('Failed to persist netlist visibility setting:', error);
        }
    }

    /**
     * Toggle the undo history pane visibility
     */
    private async toggleUndoHistory(): Promise<void> {
        const layoutHelper = this.dockExtension.getDockLayoutHelper();
        if (!layoutHelper) return;

        const newVisibility = layoutHelper.toggleUndoPaneVisibility();

        // Update the menu checkbox state
        this.menuExtension.updateMenuItem('toggle-undo-history', { checked: newVisibility });

        // Persist the setting
        try {
            const { setSetting } = await import('../settings-extension/settings-extension.js');
            await setSetting(SETTING_UNDO_HISTORY_VISIBLE, newVisibility);
        } catch (error) {
            console.warn('Failed to persist undo history visibility setting:', error);
        }
    }
}
