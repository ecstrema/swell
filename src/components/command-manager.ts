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
     * Initialize the shortcut system by loading shortcuts from JSON.
     * Commands are registered and emit events when triggered.
     * Consumers should listen to 'command-execute' events on the CommandRegistry.
     */
    initializeShortcuts(): void {
        // Register commands with stub handlers
        // Most commands just emit events; consumers listen and react
        const commandDefinitions = [
            { id: 'file-open', label: 'Open File' },
            { id: 'file-close', label: 'Close File' },
            { id: 'file-quit', label: 'Quit' },
            { id: 'edit-undo', label: 'Undo' },
            { id: 'edit-redo', label: 'Redo' },
            { id: 'view-zoom-in', label: 'Zoom In' },
            { id: 'view-zoom-out', label: 'Zoom Out' },
            { id: 'view-zoom-fit', label: 'Zoom to Fit' },
            { id: 'view-toggle-signal-selection', label: 'Toggle Signal Selection View' }
        ];

        // Register all commands - they emit events when executed via CommandRegistry
        for (const cmd of commandDefinitions) {
            this.commandRegistry.register({
                id: cmd.id,
                label: cmd.label,
                handler: () => {
                    // Stub handler: the actual work is done by event listeners in app-main.ts
                    // This allows decoupling command registration from implementation
                }
            });
        }

        // Register command palette command with its specific handler
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
