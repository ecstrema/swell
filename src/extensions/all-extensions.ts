/**
 * All Extensions Registry
 *
 * Central place to import and list all default extensions.
 * App-main will only need to import this and register each extension.
 */

import { ExtensionConstructor } from "./types.js";
import { MenuExtension } from "./menu-extension/index.js";
import { DockExtension } from "./dock-extension/index.js";
import { SettingsExtension } from "./settings-extension/index.js";
import { ShortcutEditorExtension } from "./shortcut-editor-extension/index.js";
import { WaveformFileExtension } from "./waveform-file-extension/index.js";
import { AboutExtension } from "./about-extension/index.js";
import { UndoExtension } from "./undo-extension/index.js";
import { CoreUIExtension } from "./core-ui-extension/index.js";
import { CommandPaletteExtension } from "./command-palette-extension/command-palette-extension.js";

/**
 * Get all default extensions that should be registered on startup
 */
export function getAllExtensions(): ExtensionConstructor[] {
    return [
        MenuExtension,
        DockExtension,
        CommandPaletteExtension,
        SettingsExtension,
        ShortcutEditorExtension,
        WaveformFileExtension,
        AboutExtension,
        UndoExtension,
        CoreUIExtension,
    ] as unknown as ExtensionConstructor[];
}
