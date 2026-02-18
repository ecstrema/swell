/**
 * Shortcut Extension
 *
 * Owns the ShortcutManager and loads default keyboard shortcuts from the JSON
 * configuration file. When a shortcut fires it delegates to the CommandRegistry
 * provided by CommandExtension — keeping the two concerns fully decoupled.
 */

import { Extension } from "../types.js";
import { CommandExtension } from "../command-extension/command-extension.js";
import { ShortcutManager } from "../../shortcuts/shortcut-manager.js";
import { defaultShortcuts } from "../../shortcuts/default-shortcuts.js";

export class ShortcutExtension implements Extension {
    static readonly metadata = {
        id: 'core/shortcuts',
        name: 'Shortcut Extension',
        description: 'Manages keyboard shortcuts and maps them to commands',
    };
    static readonly dependencies = [CommandExtension];

    private shortcutManager: ShortcutManager;

    constructor(dependencies: Map<string, Extension>) {
        const commandExtension = dependencies.get(CommandExtension.metadata.id) as CommandExtension;
        // CommandExtension implements CommandExecutor directly
        this.shortcutManager = new ShortcutManager(commandExtension);
    }

    async activate(): Promise<void> {
        // Load default keyboard shortcuts from the JSON configuration file
        this.shortcutManager.registerMany(defaultShortcuts);
    }

    getShortcutManager(): ShortcutManager {
        return this.shortcutManager;
    }
}
