/**
 * Command Palette Extension
 * 
 * Provides the command palette for searching and executing commands.
 */

import { Extension, ExtensionContext } from "../types.js";
import { CommandPalette } from "../../components/command/command-palette.js";

/**
 * API provided by the command palette extension
 */
export interface CommandPaletteAPI {
    /**
     * Get the command palette instance
     */
    getCommandPalette(): CommandPalette | null;
}

export class CommandPaletteExtension implements Extension {
    readonly metadata = {
        id: 'core/command-palette',
        name: 'Command Palette Extension',
        description: 'Provides command palette for searching and executing commands',
    };

    private commandPalette: CommandPalette | null = null;

    async activate(context: ExtensionContext): Promise<CommandPaletteAPI> {
        // Create command palette with access to command registry and shortcut manager
        this.commandPalette = new CommandPalette(
            context.getCommandRegistry(),
            context.getShortcutManager()
        );
        
        // Append to body
        document.body.appendChild(this.commandPalette);

        // Register command to toggle the palette
        context.registerCommand({
            id: 'core/command-palette/toggle',
            label: 'Command Palette',
            description: 'Open the command palette to search and execute commands',
            handler: () => this.togglePalette(),
        });

        // Register keyboard shortcut
        context.registerShortcut({
            shortcut: 'Ctrl+Shift+P',
            commandId: 'core/command-palette/toggle',
        });

        return {
            getCommandPalette: () => this.commandPalette,
        };
    }

    private togglePalette(): void {
        if (this.commandPalette) {
            this.commandPalette.toggle();
        }
    }
}
