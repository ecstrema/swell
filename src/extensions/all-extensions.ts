/**
 * All Extensions Registry
 * 
 * Central place to import and list all default extensions.
 * App-main will only need to import this and register each extension.
 */

import { Extension } from "./types.js";
import { MenuExtension } from "./menu-extension/index.js";
import { DockExtension } from "./dock-extension/index.js";
import { SettingsExtension } from "./settings-extension/index.js";
import { ShortcutEditorExtension } from "./shortcut-editor-extension/index.js";
import { WaveformFileExtension } from "./waveform-file-extension/index.js";
import { AboutExtension } from "./about-extension/index.js";
import { UndoExtension } from "./undo-extension/index.js";

/**
 * Get all default extensions that should be registered on startup
 */
export function getAllExtensions(): Extension[] {
    return [
        new MenuExtension(),
        new DockExtension(),
        new SettingsExtension(),
        new ShortcutEditorExtension(),
        new WaveformFileExtension(),
        new AboutExtension(),
        new UndoExtension(),
    ];
}
