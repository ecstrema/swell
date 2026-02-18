/**
 * Types for the shortcut system
 */

/**
 * Represents a keyboard shortcut combination as a string compatible with shosho (e.g. "Ctrl+S")
 */
export type KeyboardShortcut = string;

/**
 * Represents a command that can be executed
 */
export interface Command {
    id: string;
    label: string;
    description?: string;
    handler: () => void | Promise<void>;
}

/**
 * Represents an option in a selection list
 */
export interface SelectOption<T = any> {
    id: string;
    label: string;
    description?: string;
    value: T;
}

/**
 * Minimal interface required by ShortcutManager to execute commands.
 * Keeping this here avoids a circular dependency between the shortcuts
 * module and the command-extension module.
 */
export interface CommandExecutor {
    execute(commandId: string): Promise<boolean>;
}

/**
 * Maps shortcut definitions to command IDs
 */
export interface ShortcutBinding {
    shortcut: KeyboardShortcut;
    commandId: string;
}
