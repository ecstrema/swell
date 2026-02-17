/**
 * Extension Registry
 * 
 * Central registry for managing extensions and their registrations.
 * Provides a unified interface for extensions to register commands, menus, pages, settings, and themes.
 */

import {
    Extension,
    ExtensionId,
    ExtensionContext,
    PageRegistration,
    ThemeRegistration,
    CommandExecutedCallback,
    SettingChangedCallback,
    ThemeChangedCallback,
    PageDisplayedCallback,
    AppAPIs,
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
    private extensionFactories: Map<ExtensionId, () => Extension> = new Map();
    private pages: Map<string, PageRegistration> = new Map();
    private themes: Map<string, ThemeRegistration> = new Map();
    private menuItems: (MenuItemConfig | SubmenuConfig)[] = [];
    
    private commandRegistry: CommandRegistry;
    private shortcutManager: ShortcutManager;
    private appAPIs: AppAPIs = {};

    // Callbacks
    private commandExecutedCallbacks: CommandExecutedCallback[] = [];
    private settingChangedCallbacks: SettingChangedCallback[] = [];
    private themeChangedCallbacks: ThemeChangedCallback[] = [];
    private pageDisplayedCallbacks: PageDisplayedCallback[] = [];

    constructor(commandRegistry: CommandRegistry, shortcutManager: ShortcutManager) {
        this.commandRegistry = commandRegistry;
        this.shortcutManager = shortcutManager;
    }

    /**
     * Set app-wide APIs that extensions can access
     */
    setAppAPIs(apis: AppAPIs): void {
        this.appAPIs = apis;
    }

    /**
     * Register an extension
     */
    async register(extension: Extension): Promise<void> {
        if (this.extensions.has(extension.metadata.id)) {
            console.warn(`Extension ${extension.metadata.id} is already registered`);
            return;
        }

        this.extensions.set(extension.metadata.id, extension);

        // Create context for this extension
        const context = this.createContext(extension);

        // Activate the extension and store any returned API
        const api = await extension.activate(context);
        if (api !== undefined) {
            this.extensionAPIs.set(extension.metadata.id, api);
        }
    }

    /**
     * Register an extension factory for lazy loading
     */
    registerFactory(extensionId: ExtensionId, factory: () => Extension): void {
        if (this.extensions.has(extensionId)) {
            console.warn(`Extension ${extensionId} is already registered`);
            return;
        }
        this.extensionFactories.set(extensionId, factory);
    }

    /**
     * Get an extension by ID, registering it if not already registered
     */
    async getExtension<T = any>(extensionId: ExtensionId): Promise<T | undefined> {
        // If already registered, return its API
        if (this.extensionAPIs.has(extensionId)) {
            return this.extensionAPIs.get(extensionId) as T;
        }

        // If extension is registered but hasn't provided an API, return undefined
        if (this.extensions.has(extensionId)) {
            return undefined;
        }

        // If we have a factory, create and register the extension
        const factory = this.extensionFactories.get(extensionId);
        if (factory) {
            const extension = factory();
            await this.register(extension);
            return this.extensionAPIs.get(extensionId) as T;
        }

        console.warn(`Extension ${extensionId} not found`);
        return undefined;
    }

    /**
     * Unregister an extension
     */
    async unregister(extensionId: ExtensionId): Promise<void> {
        const extension = this.extensions.get(extensionId);
        if (!extension) {
            return;
        }

        // Deactivate if the extension has a deactivate method
        if (extension.deactivate) {
            await extension.deactivate();
        }

        this.extensions.delete(extensionId);
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

    /**
     * Create an extension context for a specific extension
     */
    private createContext(extension: Extension): ExtensionContext {
        return {
            registerCommand: (command: Command) => {
                this.commandRegistry.register(command);
            },

            registerShortcut: (binding: ShortcutBinding) => {
                this.shortcutManager.register(binding);
            },

            registerShortcuts: (bindings: ShortcutBinding[]) => {
                this.shortcutManager.registerMany(bindings);
            },

            registerMenu: (item: MenuItemConfig | SubmenuConfig) => {
                this.menuItems.push(item);
            },

            registerPage: (page: PageRegistration) => {
                if (this.pages.has(page.id)) {
                    console.warn(`Page ${page.id} is already registered`);
                    return;
                }
                this.pages.set(page.id, page);
            },

            registerSetting: (setting: SettingMetadata) => {
                settingsRegister.register(setting);
            },

            registerTheme: (theme: ThemeRegistration) => {
                if (this.themes.has(theme.id)) {
                    console.warn(`Theme ${theme.id} is already registered`);
                    return;
                }
                this.themes.set(theme.id, theme);
            },

            getMetadata: () => extension.metadata,

            getExtension: <T = any>(extensionId: ExtensionId): Promise<T | undefined> => {
                return this.getExtension<T>(extensionId);
            },
            
            app: this.appAPIs,
        };
    }
}
