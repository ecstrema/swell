/**
 * Shortcut Editor Extension
 *
 * Extension that displays all registered commands with their descriptions and shortcuts.
 * Allows viewing and customizing keyboard shortcuts.
 */

import { Extension } from "../types.js";
import { CommandsView } from "./commands-view.js";
import { CommandExtension } from "../command-extension/command-extension.js";
import { DockExtension } from "../dock-extension/dock-extension.js";

// Ensure the custom element is registered
if (!customElements.get('commands-view')) {
    customElements.define('commands-view', CommandsView);
}

export class ShortcutEditorExtension implements Extension {
    static readonly metadata = {
        id: 'core/shortcut-editor',
        name: 'Keyboard Shortcuts Editor',
        description: 'View and customize keyboard shortcuts for all registered commands',
    };
    static readonly dependencies = [CommandExtension, DockExtension];

    private commandExtension: CommandExtension;
    private dockExtension: DockExtension;

    constructor(dependencies: Map<string, Extension>) {
        this.commandExtension = dependencies.get(CommandExtension.metadata.id) as CommandExtension;
        this.dockExtension = dependencies.get(DockExtension.metadata.id) as DockExtension;
    }

    async activate(): Promise<void> {
        // Register a command to open the keyboard shortcuts editor
        this.commandExtension.registerCommand({
            id: 'core/commands/show',
            label: 'Keyboard Shortcuts Editor',
            description: 'View and customize keyboard shortcuts for all commands',
            handler: () => {
                const layoutHelper = this.dockExtension.getDockLayoutHelper();
                if (layoutHelper) {
                    layoutHelper.activatePane('commands-view', 'Keyboard Shortcuts', 'commands-view', true);
                }
            },
        });

        // Register a shortcut to open the keyboard shortcuts editor
        // Removed Ctrl+Shift+P as it conflicts with Command Palette
        // It should use something else, but keeping for now if user wants it (though duplicate)
        // Original code had Ctrl+Shift+P for both palette and editor?
        // CommandPaletteExtension uses Ctrl+Shift+P.
        // ShortcutEditorExtension used Ctrl+Shift+P too?
        // Let's check original. Yes line 38: shortcut: 'Ctrl+Shift+P'.
        // Conflict! I will remove it or change it.
        // Or keep it and let last one win? No.
        // Command Palette is usually Ctrl+Shift+P.
        // Shortcut Editor is usually Ctrl+K Ctrl+S in VSCode.
        // I will change to Ctrl+K Ctrl+S if possible, or leave blank.
        // I will register `Ctrl+K Ctrl+S`? No, simple strings only?
        // Let's use `Ctrl+K` for now or just skip shortcut.

        // Register the keyboard shortcuts editor as content
        const dockManager = this.dockExtension.getDockManager();
        if (dockManager) {
            dockManager.registerContent('commands-view', () => {
                const view = new CommandsView();
                // We need to pass registries to the view
                // Assuming CommandsView has methods for this as per my analysis
                if ('setCommandRegistry' in view) {
                    (view as any).setCommandRegistry(this.commandExtension.getCommandRegistry());
                }
                if ('setShortcutManager' in view) {
                    (view as any).setShortcutManager(this.commandExtension.getShortcutManager());
                }
                return view;
            });
        }
    }
}
