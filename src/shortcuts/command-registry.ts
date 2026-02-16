import { Command } from "./types.js";

/**
 * Central registry for all application commands.
 * Commands can be triggered by shortcuts, menu items, or programmatically.
 * Emits command-specific events (e.g., 'file-open', 'edit-undo') when commands are triggered.
 */
export class CommandRegistry extends EventTarget {
    private commands: Map<string, Command> = new Map();

    /**
     * Register a new command
     */
    register(command: Command): void {
        this.commands.set(command.id, command);
    }

    /**
     * Unregister a command
     */
    unregister(commandId: string): void {
        this.commands.delete(commandId);
    }

    /**
     * Execute a command by ID
     * Emits a command-specific event (e.g., 'file-open', 'edit-undo') before executing the command
     */
    async execute(commandId: string): Promise<boolean> {
        const command = this.commands.get(commandId);
        if (!command) {
            // Command not found - return false without logging in production
            // to avoid noise in logs. Callers can check the return value.
            return false;
        }

        // Emit command-specific event before executing command
        // Event type is the command ID itself (e.g., 'file-open')
        this.dispatchEvent(new CustomEvent(commandId, {
            bubbles: true,
            composed: true
        }));

        try {
            await command.handler();
            return true;
        } catch (error) {
            console.error(`Error executing command ${commandId}:`, error);
            return false;
        }
    }

    /**
     * Get a command by ID
     */
    get(commandId: string): Command | undefined {
        return this.commands.get(commandId);
    }

    /**
     * Get all registered commands
     */
    getAll(): Command[] {
        return Array.from(this.commands.values());
    }

    /**
     * Check if a command is registered
     */
    has(commandId: string): boolean {
        return this.commands.has(commandId);
    }
}
