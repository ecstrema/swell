export { CommandExtension } from "../command-extension/command-extension.js";
export { ShortcutExtension } from "./shortcut-extension.js";
export { defaultShortcuts } from "./default-shortcuts.js";
export {
    loadShortcutsFromJSON,
    validateShortcutsConfig,
    convertToShortcutBindings,
    ShortcutValidationError
} from "./shortcut-validator.js";
export type { Command, CommandExecutor, KeyboardShortcut, ShortcutBinding } from "./types.js";
export type { RawShortcutBinding, ShortcutsConfig } from "./shortcut-validator.js";
