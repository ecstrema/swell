/**
 * Types for the shortcut system
 */

/**
<<<<<<< HEAD
 * Represents a keyboard shortcut combination
 */
export interface KeyboardShortcut {
    key: string;
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
}
=======
 * Represents a keyboard shortcut combination as a string compatible with shosho (e.g. "Ctrl+S")
 */
export type KeyboardShortcut = string;
>>>>>>> 2d7e45fc37b474692ee546390cf425d4e56b1936

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
