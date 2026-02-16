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
 * Maps shortcut definitions to command IDs
 */
export interface ShortcutBinding {
    shortcut: KeyboardShortcut;
    commandId: string;
}
