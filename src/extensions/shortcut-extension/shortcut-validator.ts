/**
 * Validation module for shortcut configuration files.
 * Follows the VSCode keybindings.json format: a root array of objects
 * with "key" and "command" fields.
 *
 * Validation is performed with arktype.
 */

import { type } from "arktype";
import { ShortcutBinding } from "./types.js";

export class ShortcutValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ShortcutValidationError";
    }
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const rawShortcutBindingType = type({
    key: "string > 0",
    command: "string > 0",
});

export type RawShortcutBinding = typeof rawShortcutBindingType.infer;

const shortcutsConfigType = rawShortcutBindingType.array();

export type ShortcutsConfig = typeof shortcutsConfigType.infer;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validates the shortcuts configuration (root array).
 * Throws {@link ShortcutValidationError} if the data does not conform.
 */
export function validateShortcutsConfig(data: unknown): ShortcutsConfig {
    const result = shortcutsConfigType(data);
    if (result instanceof type.errors) {
        throw new ShortcutValidationError(result.summary);
    }
    return result;
}

/**
 * Converts raw shortcut bindings to the internal {@link ShortcutBinding} format
 * (JSON `key` → `shortcut`, JSON `command` → `commandId`).
 */
export function convertToShortcutBindings(config: ShortcutsConfig): ShortcutBinding[] {
    return config.map(raw => ({
        shortcut: raw.key,
        commandId: raw.command,
    }));
}

/**
 * Loads and validates shortcuts from a JSON string.
 */
export function loadShortcutsFromJSON(jsonString: string): ShortcutBinding[] {
    let parsed: unknown;
    try {
        parsed = JSON.parse(jsonString);
    } catch (error) {
        throw new ShortcutValidationError(
            `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`
        );
    }
    return convertToShortcutBindings(validateShortcutsConfig(parsed));
}
