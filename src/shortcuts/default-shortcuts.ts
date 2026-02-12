import { ShortcutBinding } from "./types.js";
import { loadShortcutsFromJSON } from "./shortcut-validator.js";
import defaultShortcutsJSON from "./default-shortcuts.json?raw";

/**
 * Default keyboard shortcut bindings loaded from JSON configuration.
 * The JSON file is validated on load to ensure all shortcuts are properly formatted.
 */
let defaultShortcuts: ShortcutBinding[] = [];

try {
    defaultShortcuts = loadShortcutsFromJSON(defaultShortcutsJSON);
} catch (error) {
    console.error('Failed to load default shortcuts:', error);
    // If loading fails, we fall back to an empty array
    // This prevents the application from crashing due to a misconfigured shortcuts file
}

export { defaultShortcuts };
