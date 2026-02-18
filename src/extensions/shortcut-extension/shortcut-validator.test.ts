import { describe, it, expect } from "vitest";
import {
    loadShortcutsFromJSON,
    validateShortcutsConfig,
    convertToShortcutBindings,
    ShortcutValidationError,
} from "./shortcut-validator.js";

describe("Shortcut Validator", () => {
    describe("validateShortcutsConfig", () => {
        it("should validate a valid shortcuts configuration", () => {
            const config = [
                { key: "Ctrl+O", command: "core/file/open" },
                { key: "Ctrl+W", command: "file-close" },
            ];

            const result = validateShortcutsConfig(config);
            expect(result).toEqual(config);
            expect(result).toHaveLength(2);
        });

        it("should reject non-array input", () => {
            expect(() => validateShortcutsConfig(null)).toThrow(ShortcutValidationError);
            expect(() => validateShortcutsConfig(undefined)).toThrow(ShortcutValidationError);
            expect(() => validateShortcutsConfig("string")).toThrow(ShortcutValidationError);
            expect(() => validateShortcutsConfig(123)).toThrow(ShortcutValidationError);
            expect(() => validateShortcutsConfig({ shortcuts: [] })).toThrow(ShortcutValidationError);
        });

        it("should reject shortcuts missing key field", () => {
            expect(() => validateShortcutsConfig([{ command: "core/file/open" }])).toThrow(ShortcutValidationError);
        });

        it("should reject shortcuts missing command field", () => {
            expect(() => validateShortcutsConfig([{ key: "Ctrl+O" }])).toThrow(ShortcutValidationError);
        });

        it("should reject shortcuts with empty string values", () => {
            expect(() => validateShortcutsConfig([{ key: "", command: "core/file/open" }]))
                .toThrow(ShortcutValidationError);
            expect(() => validateShortcutsConfig([{ key: "Ctrl+O", command: "" }]))
                .toThrow(ShortcutValidationError);
        });

        it("should reject shortcuts with non-string values", () => {
            expect(() => validateShortcutsConfig([{ key: 123, command: "core/file/open" }]))
                .toThrow(ShortcutValidationError);
            expect(() => validateShortcutsConfig([{ key: "Ctrl+O", command: null }]))
                .toThrow(ShortcutValidationError);
        });

        it("should accept an empty array", () => {
            expect(validateShortcutsConfig([])).toEqual([]);
        });
    });

    describe("convertToShortcutBindings", () => {
        it("should map key/command to shortcut/commandId", () => {
            const config = [
                { key: "Ctrl+O", command: "core/file/open" },
                { key: "Ctrl+W", command: "file-close" },
            ];

            const bindings = convertToShortcutBindings(config);
            expect(bindings).toHaveLength(2);
            expect(bindings[0]).toEqual({ shortcut: "Ctrl+O", commandId: "core/file/open" });
            expect(bindings[1]).toEqual({ shortcut: "Ctrl+W", commandId: "file-close" });
        });

        it("should handle empty array", () => {
            expect(convertToShortcutBindings([])).toEqual([]);
        });
    });

    describe("loadShortcutsFromJSON", () => {
        it("should load shortcuts from valid JSON string", () => {
            const json = JSON.stringify([
                { key: "Ctrl+O", command: "core/file/open" },
                { key: "Ctrl+W", command: "file-close" },
            ]);

            const bindings = loadShortcutsFromJSON(json);
            expect(bindings).toHaveLength(2);
            expect(bindings[0]).toEqual({ shortcut: "Ctrl+O", commandId: "core/file/open" });
            expect(bindings[1]).toEqual({ shortcut: "Ctrl+W", commandId: "file-close" });
        });

        it("should reject invalid JSON", () => {
            expect(() => loadShortcutsFromJSON("[invalid json]")).toThrow(ShortcutValidationError);
            expect(() => loadShortcutsFromJSON("[invalid json]")).toThrow("Invalid JSON");
        });

        it("should reject JSON with invalid structure", () => {
            const json = JSON.stringify([{ key: "Ctrl+O" /* missing command */ }]);
            expect(() => loadShortcutsFromJSON(json)).toThrow(ShortcutValidationError);
        });

        it("should handle empty array", () => {
            expect(loadShortcutsFromJSON("[]")).toEqual([]);
        });
    });
});
