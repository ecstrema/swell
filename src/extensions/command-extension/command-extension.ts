
import { Extension, ExtensionConstructor } from "../types.js";
import { CommandRegistry } from "../../shortcuts/command-registry.js";
import { ShortcutManager } from "../../shortcuts/shortcut-manager.js";
import { Command, ShortcutBinding } from "../../shortcuts/types.js";

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
        // No-op
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

    registerShortcut(binding: ShortcutBinding) {
        this.shortcutManager.register(binding);
    }

    registerShortcuts(bindings: ShortcutBinding[]) {
        this.shortcutManager.registerMany(bindings);
    }

    executeCommand(commandId: string) {
        this.commandRegistry.execute(commandId);
    }
}
