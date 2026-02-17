/**
 * Extension System Types
 * 
 * Core types for the extension-based architecture.
 * Extensions can register commands, menus, pages, settings, and themes.
 */

import { Command, ShortcutBinding } from "../shortcuts/types.js";
import { SettingMetadata } from "../settings/settings-register.js";
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
    /** Version string */
    version: string;
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
 * App APIs that extensions can access
 */
export interface AppAPIs {
    /**
     * Get the UndoManager for undo/redo operations
     */
    getUndoManager?: () => any;

    /**
     * Get the FileManager for file operations
     */
    getFileManager?: () => any;

    /**
     * Get the PaneManager for managing panes
     */
    getPaneManager?: () => any;

    /**
     * Get the DockManager for dock operations
     */
    getDockManager?: () => any;
}

/**
 * Extension context - provides APIs for extensions to interact with the app
 */
export interface ExtensionContext {
    /**
     * Register a command that can be triggered by shortcuts or menus
     */
    registerCommand(command: Command): void;

    /**
     * Register a keyboard shortcut binding
     */
    registerShortcut(binding: ShortcutBinding): void;

    /**
     * Register multiple keyboard shortcuts at once
     */
    registerShortcuts(bindings: ShortcutBinding[]): void;

    /**
     * Register a menu item or submenu
     */
    registerMenu(item: MenuItemConfig | SubmenuConfig): void;

    /**
     * Register a page/view that can be displayed in the app
     */
    registerPage(page: PageRegistration): void;

    /**
     * Register a setting
     */
    registerSetting(setting: SettingMetadata): void;

    /**
     * Register a color theme
     */
    registerTheme(theme: ThemeRegistration): void;

    /**
     * Get the extension's own metadata
     */
    getMetadata(): ExtensionMetadata;

    /**
     * Get an extension by ID, registering it if not already registered
     * Returns the API provided by the extension's activate method
     */
    getExtension<T = any>(extensionId: ExtensionId): Promise<T | undefined>;

    /**
     * Access to app-wide APIs (optional services provided by the host app)
     */
    app: AppAPIs;
}

/**
 * Extension interface - all extensions must implement this
 */
export interface Extension {
    /**
     * Extension metadata
     */
    readonly metadata: ExtensionMetadata;

    /**
     * Called when the extension is activated
     * Extensions should register their commands, menus, pages, settings, and themes here
     * Can return an API object that other extensions can access via context.getExtension()
     */
    activate(context: ExtensionContext): void | Promise<void> | any | Promise<any>;

    /**
     * Called when the extension is deactivated (optional)
     * Extensions should clean up any resources here
     */
    deactivate?(): void | Promise<void>;
}

/**
 * Callback types for extension lifecycle events
 */
export type CommandExecutedCallback = (commandId: string) => void;
export type SettingChangedCallback = (path: string, value: any) => void;
export type ThemeChangedCallback = (themeId: string) => void;
export type PageDisplayedCallback = (pageId: string) => void;
