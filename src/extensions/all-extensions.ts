/**
 * All Extensions
 *
 * Statically imports every available extension and maps each entry in
 * extensions.json to its constructor.  App-main reads the JSON list and
 * registers the corresponding constructors directly — no meta-extension needed.
 */

import { ExtensionConstructor } from "./types.js";
import extensionsConfig from "./extensions.json";
import { MenuExtension } from "./menu-extension/index.js";
import { DockExtension } from "./dock-extension/index.js";
import { SettingsExtension } from "./settings-extension/index.js";
import { ShortcutEditorExtension } from "./shortcut-editor-extension/index.js";
import { WaveformFileExtension } from "./waveform-file-extension/index.js";
import { AboutExtension } from "./about-extension/index.js";
import { UndoExtension } from "./undo-extension/index.js";
import { CoreUIExtension } from "./core-ui-extension/index.js";
import { ShortcutExtension } from "./shortcut-extension/index.js";
import { CommandPaletteExtension } from "./command-palette-extension/command-palette-extension.js";

const available: Record<string, ExtensionConstructor> = {
    "menu-extension": MenuExtension,
    "dock-extension": DockExtension,
    "shortcut-extension": ShortcutExtension,
    "command-palette-extension": CommandPaletteExtension,
    "settings-extension": SettingsExtension,
    "shortcut-editor-extension": ShortcutEditorExtension,
    "waveform-file-extension": WaveformFileExtension,
    "about-extension": AboutExtension,
    "undo-extension": UndoExtension,
    "core-ui-extension": CoreUIExtension,
};

/**
 * Returns the ordered list of extension constructors declared in extensions.json.
 * Unknown entries are silently skipped with a console warning.
 */
export function getAllExtensions(): ExtensionConstructor[] {
    return extensionsConfig.extensions.flatMap(name => {
        const ctor = available[name];
        if (!ctor) {
            console.warn(`[extensions.json] Unknown extension "${name}" — skipping.`);
            return [];
        }
        return [ctor];
    });
}
