/**
 * Types for the shortcut system
 */

/**
 * Represents a keyboard shortcut combination
 */
export interface KeyboardShortcut {
    key: string;
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
}

/**
 * Represents a command that can be executed
 */
export interface Command {
    id: string;
    label: string;
    handler: () => void | Promise<void>;
}

/**
 * Maps shortcut definitions to command IDs
 */
export interface ShortcutBinding {
    shortcut: KeyboardShortcut;
    commandId: string;
}
