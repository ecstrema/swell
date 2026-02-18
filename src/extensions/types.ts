/**
 * Extension System Types
 *
 * Core types for the extension-based architecture.
 * Extensions can register commands, menus, pages, settings, and themes.
 */

import { Command, ShortcutBinding } from "../shortcuts/types.js";
import { SettingMetadata } from "./settings-extension/settings-extension.js";
import { MenuItemConfig, SubmenuConfig } from "../menu-api/menu-api.js";

/**
 * Unique identifier for an extension
 */
export type ExtensionId = string;

/**
 * Extension metadata
 */
export interface ExtensionMetadata {
    /** Unique ID for the extension (e.g., "core/file", "core/view") */
    id: ExtensionId;
    /** Human-readable name */
    name: string;
    /** Brief description of what the extension provides */
    description?: string;
    /** List of extension IDs that this extension depends on */
    dependencies?: ExtensionId[];
}

/**
 * Page registration for an extension
 */
export interface PageRegistration {
    /** Unique ID for the page */
    id: string;
    /** Display title for the page */
    title: string;
    /** Icon for the page (optional) */
    icon?: string;
    /** Factory function to create the page element */
    factory: () => HTMLElement;
}

/**
 * Theme registration for an extension
 */
export interface ThemeRegistration {
    /** Unique ID for the theme */
    id: string;
    /** Display name for the theme */
    name: string;
    /** CSS variables to apply when this theme is active */
    cssVariables: Record<string, string>;
}

/**
 * Extension interface - all extensions must implement this
 */

export interface Extension {
    /**
     * Called when the extension is activated
     */
    activate(): void | Promise<void>;

    /**
     * Called when the extension is deactivated (optional)
     */
    deactivate?(): void | Promise<void>;
}

/**
 * Extension constructor interface
 */
export interface ExtensionConstructor {
    /**
     * Extension metadata (id, name, description)
     */
    readonly metadata: ExtensionMetadata;

    /**
     * Dependencies as Constructors, so they can be recursively registered
     */
    readonly dependencies?: ExtensionConstructor[];

    /**
     * Constructor receives dependencies map (ID -> Instance)
     */
    new(dependencies: Map<string, Extension>): Extension;
}


/**
 * Callback types for extension lifecycle events
 */
export type CommandExecutedCallback = (commandId: string) => void;
export type SettingChangedCallback = (path: string, value: any) => void;
export type ThemeChangedCallback = (themeId: string) => void;
export type PageDisplayedCallback = (pageId: string) => void;
