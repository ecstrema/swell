/**
 * Validation module for shortcut configuration files
 */

import { ShortcutBinding } from "./types.js";

/**
 * Raw shortcut binding from JSON
 */
export interface RawShortcutBinding {
    shortcut: string;
    commandId: string;
}

/**
 * Structure of the shortcuts JSON file
 */
export interface ShortcutsConfig {
    shortcuts: RawShortcutBinding[];
}

/**
 * Validation error class
 */
export class ShortcutValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ShortcutValidationError';
    }
}

/**
 * Validates that a value is a non-empty string
 */
function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validates and trims a string value
 */
function validateAndTrimString(value: unknown, fieldName: string, index: number): string {
    if (!isNonEmptyString(value)) {
        throw new ShortcutValidationError(`Shortcut at index ${index} has invalid '${fieldName}' field (must be a non-empty string)`);
    }
    return value.trim();
}

/**
 * Validates a single shortcut binding
 */
function validateShortcutBinding(binding: unknown, index: number): RawShortcutBinding {
    if (!binding || typeof binding !== 'object') {
        throw new ShortcutValidationError(`Shortcut at index ${index} is not an object`);
    }

    const obj = binding as Record<string, unknown>;

    // Validate and trim shortcut field
    if (!('shortcut' in obj)) {
        throw new ShortcutValidationError(`Shortcut at index ${index} is missing 'shortcut' field`);
    }
    const shortcut = validateAndTrimString(obj.shortcut, 'shortcut', index);

    // Validate and trim commandId field
    if (!('commandId' in obj)) {
        throw new ShortcutValidationError(`Shortcut at index ${index} is missing 'commandId' field`);
    }
    const commandId = validateAndTrimString(obj.commandId, 'commandId', index);

    return {
        shortcut,
        commandId,
    };
}

/**
 * Validates the shortcuts configuration structure
 */
export function validateShortcutsConfig(data: unknown): ShortcutsConfig {
    // Check if data is an object
    if (!data || typeof data !== 'object') {
        throw new ShortcutValidationError('Configuration must be an object');
    }

    const config = data as Record<string, unknown>;

    // Check for shortcuts array
    if (!('shortcuts' in config)) {
        throw new ShortcutValidationError('Configuration is missing "shortcuts" field');
    }

    if (!Array.isArray(config.shortcuts)) {
        throw new ShortcutValidationError('"shortcuts" field must be an array');
    }

    // Validate each shortcut
    const validatedShortcuts: RawShortcutBinding[] = [];
    for (let i = 0; i < config.shortcuts.length; i++) {
        validatedShortcuts.push(validateShortcutBinding(config.shortcuts[i], i));
    }

    return {
        shortcuts: validatedShortcuts
    };
}

/**
 * Converts raw shortcut bindings to the internal format
 */
export function convertToShortcutBindings(config: ShortcutsConfig): ShortcutBinding[] {
    return config.shortcuts.map(raw => ({
        shortcut: raw.shortcut,
        commandId: raw.commandId
    }));
}

/**
 * Loads and validates shortcuts from a JSON string
 */
export function loadShortcutsFromJSON(jsonString: string): ShortcutBinding[] {
    let parsed: unknown;

    try {
        parsed = JSON.parse(jsonString);
    } catch (error) {
        throw new ShortcutValidationError(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }

    const config = validateShortcutsConfig(parsed);
    return convertToShortcutBindings(config);
}
