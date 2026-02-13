import { Command } from "./types.js";

/**
 * Central registry for all application commands.
 * Commands can be triggered by shortcuts, menu items, or programmatically.
 */
export class CommandRegistry {
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
     */
    async execute(commandId: string): Promise<boolean> {
        const command = this.commands.get(commandId);
        if (!command) {
            // Command not found - return false without logging in production
            // to avoid noise in logs. Callers can check the return value.
            return false;
        }

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
