/**
 * All Extensions Registry
 * 
 * Central place to import and list all default extensions.
 * App-main will only need to import this and register each extension.
 */

import { Extension } from "./types.js";
import { ShortcutEditorExtension } from "./shortcut-editor-extension/index.js";
import { SettingsExtension } from "./settings-extension/index.js";
import { AboutExtension } from "./about-extension/index.js";
import { UndoExtension } from "./undo-extension/index.js";

/**
 * Get all default extensions that should be registered on startup
 */
export function getAllExtensions(): Extension[] {
    return [
        new ShortcutEditorExtension(),
        new SettingsExtension(),
        new AboutExtension(),
        new UndoExtension(),
    ];
}
