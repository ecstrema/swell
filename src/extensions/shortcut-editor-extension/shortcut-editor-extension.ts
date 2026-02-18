/**
 * Shortcut Editor Extension
 *
 * Extension that displays all registered commands with their descriptions and shortcuts.
 * Allows viewing and customizing keyboard shortcuts.
 */

import { Extension } from "../types.js";
import { CommandsView } from "./commands-view.js";
import { CommandExtension } from "../command-extension/command-extension.js";
import { ShortcutExtension } from "../shortcut-extension/shortcut-extension.js";
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
    static readonly dependencies = [CommandExtension, ShortcutExtension, DockExtension];

    private commandExtension: CommandExtension;
    private shortcutExtension: ShortcutExtension;
    private dockExtension: DockExtension;

    constructor(dependencies: Map<string, Extension>) {
        this.commandExtension = dependencies.get(CommandExtension.metadata.id) as CommandExtension;
        this.shortcutExtension = dependencies.get(ShortcutExtension.metadata.id) as ShortcutExtension;
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
                    layoutHelper.activatePane('commands-view');
                }
            },
        });

        // Register the keyboard shortcuts editor as content
        this.dockExtension.registerContent('commands-view', 'Keyboard Shortcuts', () => {
            const view = new CommandsView();
            if ('setCommandRegistry' in view) {
                (view as any).setCommandRegistry(this.commandExtension);
            }
            if ('setShortcutManager' in view) {
                (view as any).setShortcutManager(this.shortcutExtension);
            }
            return view;
        });
    }
}
