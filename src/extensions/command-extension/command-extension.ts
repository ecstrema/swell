
import { Extension } from "../types.js";
import { CommandRegistry } from "../../shortcuts/command-registry.js";
import { ShortcutManager } from "../../shortcuts/shortcut-manager.js";
import { Command } from "../../shortcuts/types.js";
import { defaultShortcuts } from "../../shortcuts/default-shortcuts.js";

export class CommandExtension implements Extension {
    static readonly metadata = {
        id: 'core/commands',
        name: 'Command Extension',
        description: 'Provides command registry and shortcut management',
    };

    private commandRegistry: CommandRegistry;
    private shortcutManager: ShortcutManager;

    constructor(dependencies: Map<string, Extension>) {
        this.commandRegistry = new CommandRegistry();
        this.shortcutManager = new ShortcutManager(this.commandRegistry);
    }

    async activate(): Promise<void> {
        // Load default keyboard shortcuts from the JSON configuration file
        this.shortcutManager.registerMany(defaultShortcuts);
    }

    getCommandRegistry(): CommandRegistry {
        return this.commandRegistry;
    }

    getShortcutManager(): ShortcutManager {
        return this.shortcutManager;
    }

    registerCommand(command: Command) {
        this.commandRegistry.register(command);
    }

    executeCommand(commandId: string) {
        this.commandRegistry.execute(commandId);
    }
}
