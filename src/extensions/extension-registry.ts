/**
 * Extension Registry
 *
 * Central registry for managing extensions and their registrations.
 * Provides a unified interface for extensions to register commands, menus, pages, settings, and themes.
 */

import {
    Extension,
    ExtensionId,
    PageRegistration,
    ThemeRegistration,
    CommandExecutedCallback,
    SettingChangedCallback,
    ThemeChangedCallback,
    PageDisplayedCallback,
    ExtensionConstructor
} from "./types.js";
import { Command, ShortcutBinding } from "../shortcuts/types.js";
import { CommandRegistry } from "../shortcuts/command-registry.js";
import { ShortcutManager } from "../shortcuts/shortcut-manager.js";
import { SettingMetadata, settingsRegister } from "../extensions/settings-extension/settings-extension.js";
import { MenuItemConfig, SubmenuConfig } from "../menu-api/menu-api.js";

/**
 * Central registry for all extensions
 */
export class ExtensionRegistry {
    private extensions: Map<ExtensionId, Extension> = new Map();
    private extensionAPIs: Map<ExtensionId, any> = new Map();
    private pages: Map<string, PageRegistration> = new Map();
    private themes: Map<string, ThemeRegistration> = new Map();
    private menuItems: (MenuItemConfig | SubmenuConfig)[] = [];

    // Callbacks
    private commandExecutedCallbacks: CommandExecutedCallback[] = [];
    private settingChangedCallbacks: SettingChangedCallback[] = [];
    private themeChangedCallbacks: ThemeChangedCallback[] = [];
    private pageDisplayedCallbacks: PageDisplayedCallback[] = [];

    constructor() {
    }

    /**
     * Register an extension class and recursively its dependencies
     */
    async register(ExtensionClass: ExtensionConstructor): Promise<void> {
        const id = ExtensionClass.metadata.id;

        if (this.extensions.has(id)) {
            return;
        }

        const dependencyMap = new Map<string, Extension>();

        // Handle dependencies
        if (ExtensionClass.dependencies && Array.isArray(ExtensionClass.dependencies)) {
            for (const DepClass of ExtensionClass.dependencies) {
                // Ensure dependency is registered
                await this.register(DepClass);

                // Get the instance
                const depId = DepClass.metadata.id;
                const depInstance = this.extensions.get(depId);
                if (depInstance) {
                    dependencyMap.set(depId, depInstance);
                } else {
                    console.error(`Failed to resolve dependency ${depId} for ${id}`);
                }
            }
        }

        // Instantiate
        const extension = new ExtensionClass(dependencyMap);
        this.extensions.set(id, extension);

        // Activate
        const api = await extension.activate();
        if (api !== undefined) {
            this.extensionAPIs.set(id, api);
        }
    }

    /**
     * Get an extension API by ID
     */
    async getExtension<T = any>(extensionId: ExtensionId): Promise<T | undefined> {
        return this.extensionAPIs.get(extensionId) as T;
    }

    /**
     * Unregister an extension
     */
    async unregister(extensionId: ExtensionId): Promise<void> {
        const extension = this.extensions.get(extensionId);
        if (!extension) {
            return;
        }

        if (extension.deactivate) {
            await extension.deactivate();
        }

        this.extensions.delete(extensionId);
        this.extensionAPIs.delete(extensionId);
    }

    /**
     * Get all registered extensions
     */
    getExtensions(): Extension[] {
        return Array.from(this.extensions.values());
    }

    /**
     * Get all registered pages
     */
    getPages(): PageRegistration[] {
        return Array.from(this.pages.values());
    }

    /**
     * Get a page by ID
     */
    getPage(pageId: string): PageRegistration | undefined {
        return this.pages.get(pageId);
    }

    /**
     * Get all registered themes
     */
    getThemes(): ThemeRegistration[] {
        return Array.from(this.themes.values());
    }

    /**
     * Get a theme by ID
     */
    getTheme(themeId: string): ThemeRegistration | undefined {
        return this.themes.get(themeId);
    }

    /**
     * Get all registered menu items
     */
    getMenuItems(): (MenuItemConfig | SubmenuConfig)[] {
        return [...this.menuItems];
    }

    /**
     * Notify that a command was executed
     */
    notifyCommandExecuted(commandId: string): void {
        this.commandExecutedCallbacks.forEach(cb => cb(commandId));
    }

    /**
     * Notify that a setting was changed
     */
    notifySettingChanged(path: string, value: any): void {
        this.settingChangedCallbacks.forEach(cb => cb(path, value));
    }

    /**
     * Notify that a theme was changed
     */
    notifyThemeChanged(themeId: string): void {
        this.themeChangedCallbacks.forEach(cb => cb(themeId));
    }

    /**
     * Notify that a page was displayed
     */
    notifyPageDisplayed(pageId: string): void {
        this.pageDisplayedCallbacks.forEach(cb => cb(pageId));
    }

    /**
     * Register a callback for command executions
     */
    onCommandExecuted(callback: CommandExecutedCallback): void {
        this.commandExecutedCallbacks.push(callback);
    }

    /**
     * Register a callback for setting changes
     */
    onSettingChanged(callback: SettingChangedCallback): void {
        this.settingChangedCallbacks.push(callback);
    }

    /**
     * Register a callback for theme changes
     */
    onThemeChanged(callback: ThemeChangedCallback): void {
        this.themeChangedCallbacks.push(callback);
    }

    /**
     * Register a callback for page displays
     */
    onPageDisplayed(callback: PageDisplayedCallback): void {
        this.pageDisplayedCallbacks.push(callback);
    }
}
