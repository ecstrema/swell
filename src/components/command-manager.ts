import { CommandRegistry, ShortcutManager, defaultShortcuts } from "../shortcuts/index.js";
import { CommandPalette } from "./command-palette.js";

/**
 * Manages the command registry, shortcuts, and command palette
 */
export class CommandManager {
    private commandRegistry: CommandRegistry;
    private shortcutManager: ShortcutManager;
    private commandPalette: CommandPalette | null = null;

    constructor() {
        this.commandRegistry = new CommandRegistry();
        this.shortcutManager = new ShortcutManager(this.commandRegistry);
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
     * Get the command palette
     */
    getCommandPalette(): CommandPalette | null {
        return this.commandPalette;
    }

    /**
     * Initialize the command palette
     */
    initializeCommandPalette(): void {
        this.commandPalette = new CommandPalette(this.commandRegistry);
        document.body.appendChild(this.commandPalette);
    }

    /**
     * Initialize the shortcut system with commands and bindings
     */
    initializeShortcuts(commandHandlers: {
        onFileOpen: () => void,
        onFileQuit: () => Promise<void>,
        onEditUndo: () => void,
        onEditRedo: () => void,
        onZoomIn: () => void,
        onZoomOut: () => void,
        onZoomFit: () => void,
        onToggleSignalSelection: () => void
    }): void {
        // Register commands that can be triggered by shortcuts or menu items
        this.commandRegistry.register({
            id: 'file-open',
            label: 'Open File',
            handler: commandHandlers.onFileOpen
        });

        this.commandRegistry.register({
            id: 'file-quit',
            label: 'Quit',
            handler: commandHandlers.onFileQuit
        });

        this.commandRegistry.register({
            id: 'edit-undo',
            label: 'Undo',
            handler: commandHandlers.onEditUndo
        });

        this.commandRegistry.register({
            id: 'edit-redo',
            label: 'Redo',
            handler: commandHandlers.onEditRedo
        });

        this.commandRegistry.register({
            id: 'view-zoom-in',
            label: 'Zoom In',
            handler: commandHandlers.onZoomIn
        });

        this.commandRegistry.register({
            id: 'view-zoom-out',
            label: 'Zoom Out',
            handler: commandHandlers.onZoomOut
        });

        this.commandRegistry.register({
            id: 'view-zoom-fit',
            label: 'Zoom to Fit',
            handler: commandHandlers.onZoomFit
        });

        this.commandRegistry.register({
            id: 'view-toggle-signal-selection',
            label: 'Toggle Signal Selection View',
            handler: commandHandlers.onToggleSignalSelection
        });

        // Register command palette command
        this.commandRegistry.register({
            id: 'command-palette-toggle',
            label: 'Open Command Palette',
            handler: () => {
                if (this.commandPalette) {
                    this.commandPalette.toggle();
                }
            }
        });

        // Register clear local storage command
        this.commandRegistry.register({
            id: 'settings-clear-local-storage',
            label: 'Clear Local Storage',
            handler: () => {
                if (confirm('Are you sure you want to clear all local storage? This will reset all settings, theme preferences, and file states.')) {
                    localStorage.clear();
                    alert('Local storage has been cleared. The page will now reload.');
                    window.location.reload();
                }
            }
        });

        // Register default shortcuts (currently empty, but ready for future use)
        this.shortcutManager.registerMany(defaultShortcuts);

        // Register keyboard shortcut to open command palette (Ctrl+K or Cmd+K)
        this.shortcutManager.register({
            shortcut: 'Ctrl+K',
            commandId: 'command-palette-toggle'
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
