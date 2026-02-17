/**
 * Commands Extension
 * 
 * Extension that displays all registered commands with their descriptions and shortcuts.
 * Proof of concept for the extension system.
 */

import { Extension, ExtensionContext } from "../types.js";
import { CommandsView } from "./commands-view.js";

// Ensure the custom element is registered
if (!customElements.get('commands-view')) {
    customElements.define('commands-view', CommandsView);
}

export class CommandsExtension implements Extension {
    readonly metadata = {
        id: 'core/commands',
        name: 'Keyboard Shortcuts Editor',
        description: 'View and customize keyboard shortcuts for all registered commands',
        version: '1.0.0',
    };

    async activate(context: ExtensionContext): Promise<void> {
        // Register a command to open the keyboard shortcuts editor
        context.registerCommand({
            id: 'core/commands/show',
            label: 'Keyboard Shortcuts Editor',
            description: 'View and customize keyboard shortcuts for all commands',
            handler: () => {
                // This will be handled by opening the commands page
                console.log('Keyboard shortcuts editor opened');
            },
        });

        // Register a shortcut to open the keyboard shortcuts editor
        context.registerShortcut({
            shortcut: 'Ctrl+Shift+P',
            commandId: 'core/commands/show',
        });

        // Register the keyboard shortcuts editor as a page
        context.registerPage({
            id: 'commands-view',
            title: 'Keyboard Shortcuts',
            icon: '⌨️',
            factory: () => new CommandsView(),
        });
    }
}
