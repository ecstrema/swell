import { ShortcutBinding } from "./types.js";

/**
 * Default keyboard shortcut bindings.
 * Currently empty as no shortcuts are set yet.
 * This can be extended in the future to include default shortcuts like:
 * - Ctrl+O for Open File
 * - Ctrl+W for Close Tab
 * - Ctrl+Q for Quit
 * etc.
 */
export const defaultShortcuts: ShortcutBinding[] = [
    // Example (currently commented out):
    // {
    //     shortcut: { key: 'o', ctrl: true },
    //     commandId: 'file-open'
    // },
    // {
    //     shortcut: { key: 'w', ctrl: true },
    //     commandId: 'file-close'
    // }
];
