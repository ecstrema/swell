import { Extension } from "../types.js";
import { Command, CommandExecutor } from "../shortcut-extension/types.js";

/**
 * Provides the command registry.
 * Other extensions register their commands here; the shortcut and menu systems
 * execute commands through this class.
 *
 * Implements CommandExecutor so it can be passed directly to ShortcutManager.
 */
export class CommandExtension implements Extension, CommandExecutor {
    static readonly metadata = {
        id: 'core/commands',
        name: 'Command Extension',
        description: 'Provides the command registry',
    };

    private commands: Map<string, Command> = new Map();

    constructor(_dependencies: Map<string, Extension>) {}

    async activate(): Promise<void> {}

    // ── Registry API ────────────────────────────────────────────────────────

    register(command: Command): void {
        this.commands.set(command.id, command);
    }

    /** Alias kept for callers that use the longer name. */
    registerCommand(command: Command): void {
        this.register(command);
    }

    unregister(commandId: string): void {
        this.commands.delete(commandId);
    }

    async execute(commandId: string): Promise<boolean> {
        const command = this.commands.get(commandId);
        if (!command) return false;
        try {
            await command.handler();
            return true;
        } catch (error) {
            console.error(`Error executing command ${commandId}:`, error);
            return false;
        }
    }

    get(commandId: string): Command | undefined {
        return this.commands.get(commandId);
    }

    getAll(): Command[] {
        return Array.from(this.commands.values());
    }

    has(commandId: string): boolean {
        return this.commands.has(commandId);
    }
}
