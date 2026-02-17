import { CommandRegistry, ShortcutManager, defaultShortcuts } from "../../shortcuts/index.js";
import { ExtensionRegistry } from "../../extensions/index.js";

/**
 * Manages the command registry, shortcuts, and extensions
 */
export class CommandManager {
    private commandRegistry: CommandRegistry;
    private shortcutManager: ShortcutManager;
    private extensionRegistry: ExtensionRegistry;

    constructor() {
        this.commandRegistry = new CommandRegistry();
        this.shortcutManager = new ShortcutManager(this.commandRegistry);
        this.extensionRegistry = new ExtensionRegistry(this.commandRegistry, this.shortcutManager);
    }

    /**
     * Get the command registry
     */
    getCommandRegistry(): CommandRegistry {
        return this.commandRegistry;
    }

    /**
     * Get the shortcut manager
     */
    getShortcutManager(): ShortcutManager {
        return this.shortcutManager;
    }

    /**
     * Get the extension registry
     */
    getExtensionRegistry(): ExtensionRegistry {
        return this.extensionRegistry;
    }

    /**
     * Initialize the shortcut system with commands and bindings
     */
    initializeShortcuts(commandHandlers: {
        onFileOpen: () => void,
        onFileQuit: () => Promise<void>,
        onZoomIn: () => void,
        onZoomOut: () => void,
        onZoomFit: () => void,
        onToggleNetlist: () => void,
    }): void {
        // Register commands that can be triggered by shortcuts or menu items
        // Using hierarchical naming: core/category/action
        this.commandRegistry.register({
            id: 'core/file/open',
            label: 'Open File',
            description: 'Open a waveform file',
            handler: commandHandlers.onFileOpen
        });

        this.commandRegistry.register({
            id: 'core/file/quit',
            label: 'Quit',
            description: 'Quit the application',
            handler: commandHandlers.onFileQuit
        });

        this.commandRegistry.register({
            id: 'core/view/zoom-in',
            label: 'Zoom In',
            description: 'Zoom in on the waveform',
            handler: commandHandlers.onZoomIn
        });

        this.commandRegistry.register({
            id: 'core/view/zoom-out',
            label: 'Zoom Out',
            description: 'Zoom out on the waveform',
            handler: commandHandlers.onZoomOut
        });

        this.commandRegistry.register({
            id: 'core/view/zoom-fit',
            label: 'Zoom to Fit',
            description: 'Fit the waveform to the view',
            handler: commandHandlers.onZoomFit
        });

        this.commandRegistry.register({
            id: 'core/view/toggle-netlist',
            label: 'Toggle Netlist View',
            description: 'Show or hide the netlist panel',
            handler: commandHandlers.onToggleNetlist
        });

        // Register command palette command
        this.commandRegistry.register({
            id: 'core/command-palette/toggle',
            label: 'Open Command Palette',
            description: 'Open the command palette to search and execute commands',
            handler: () => {
                if (this.commandPalette) {
                    this.commandPalette.toggle();
                }
            }
        });

        // Register clear local storage command
        this.commandRegistry.register({
            id: 'core/settings/clear-local-storage',
            label: 'Clear Local Storage',
            description: 'Clear all local storage data (settings, theme, file states)',
            handler: () => {
                if (confirm('Are you sure you want to clear all local storage? This will reset all settings, theme preferences, and file states.')) {
                    localStorage.clear();
                    alert('Local storage has been cleared. The page will now reload.');
                    window.location.reload();
                }
            }
        });

        // Register default shortcuts (from JSON file)
        this.shortcutManager.registerMany(defaultShortcuts);

        // Register keyboard shortcut to open command palette (Ctrl+K or Cmd+K)
        this.shortcutManager.register({
            shortcut: 'Ctrl+K',
            commandId: 'core/command-palette/toggle'
        });

        // Activate the shortcut system
        this.shortcutManager.activate();
    }

    /**
     * Deactivate the shortcut system
     */
    deactivate(): void {
        this.shortcutManager.deactivate();

        // Clean up command palette
        if (this.commandPalette && this.commandPalette.parentNode) {
            this.commandPalette.parentNode.removeChild(this.commandPalette);
        }
    }
}
