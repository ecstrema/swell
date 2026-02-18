/**
 * Command Palette Extension
 *
 * Provides the command palette for searching and executing commands.
 */

import { Extension } from "../types.js";
import { CommandPalette } from "../../components/command/command-palette.js";
import { CommandExtension } from "../command-extension/command-extension.js";

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
    static readonly metadata = {
        id: 'core/command-palette',
        name: 'Command Palette Extension',
        description: 'Provides command palette for searching and executing commands',
    };
    static readonly dependencies = [CommandExtension];

    private commandExtension: CommandExtension;
    private commandPalette: CommandPalette | null = null;

    constructor(dependencies: Map<string, Extension>) {
        this.commandExtension = dependencies.get(CommandExtension.metadata.id) as CommandExtension;
    }

    async activate(): Promise<void> {
        // Create command palette with access to command registry and shortcut manager
        this.commandPalette = new CommandPalette(
            this.commandExtension.getCommandRegistry(),
            this.commandExtension.getShortcutManager()
        );

        // Append to body
        document.body.appendChild(this.commandPalette);

        // Register command to toggle the palette
        this.commandExtension.registerCommand({
            id: 'core/command-palette/toggle',
            label: 'Command Palette',
            description: 'Open the command palette to search and execute commands',
            handler: () => this.togglePalette(),
        });

        // Register keyboard shortcut
        this.commandExtension.registerShortcut({
            shortcut: 'Ctrl+Shift+P',
            commandId: 'core/command-palette/toggle',
        });
    }

    getCommandPalette(): CommandPalette | null {
        return this.commandPalette;
    }

    private togglePalette(): void {
        if (this.commandPalette) {
            this.commandPalette.toggle();
        }
    }
}
