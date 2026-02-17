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
        name: 'Commands Extension',
        description: 'Displays all registered commands with their descriptions and shortcuts',
        version: '1.0.0',
    };

    async activate(context: ExtensionContext): Promise<void> {
        // Register a command to open the commands view
        context.registerCommand({
            id: 'core/commands/show',
            label: 'Show All Commands',
            description: 'Display all registered commands with their shortcuts',
            handler: () => {
                // This will be handled by opening the commands page
                console.log('Commands view opened');
            },
        });

        // Register a shortcut to open the commands view
        context.registerShortcut({
            shortcut: 'Ctrl+Shift+P',
            commandId: 'core/commands/show',
        });

        // Register the commands view as a page
        context.registerPage({
            id: 'commands-view',
            title: 'All Commands',
            icon: '⌨️',
            factory: () => new CommandsView(),
        });
    }
}
