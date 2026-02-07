import { KeyboardShortcut, ShortcutBinding } from "./types.js";
import { CommandRegistry } from "./command-registry.js";

/**
 * Manages keyboard shortcuts and maps them to commands
 */
export class ShortcutManager {
    private bindings: ShortcutBinding[] = [];
    private commandRegistry: CommandRegistry;
    private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

    constructor(commandRegistry: CommandRegistry) {
        this.commandRegistry = commandRegistry;
    }

    /**
     * Register a keyboard shortcut binding
     */
    register(binding: ShortcutBinding): void {
        this.bindings.push(binding);
    }

    /**
     * Register multiple shortcut bindings at once
     */
    registerMany(bindings: ShortcutBinding[]): void {
        this.bindings.push(...bindings);
    }

    /**
     * Unregister a shortcut by command ID
     */
    unregister(commandId: string): void {
        this.bindings = this.bindings.filter(b => b.commandId !== commandId);
    }

    /**
     * Start listening for keyboard events
     */
    activate(target: EventTarget = document): void {
        if (this.keydownHandler) {
            this.deactivate(target);
        }

        this.keydownHandler = (e: KeyboardEvent) => {
            this.handleKeyDown(e);
        };

        target.addEventListener('keydown', this.keydownHandler);
    }

    /**
     * Stop listening for keyboard events
     */
    deactivate(target: EventTarget = document): void {
        if (this.keydownHandler) {
            target.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }
    }

    /**
     * Handle keyboard events
     */
    private handleKeyDown(e: KeyboardEvent): void {
        // Don't trigger shortcuts when typing in input fields
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        for (const binding of this.bindings) {
            if (this.matchesShortcut(e, binding.shortcut)) {
                e.preventDefault();
                e.stopPropagation();
                this.commandRegistry.execute(binding.commandId);
                return;
            }
        }
    }

    /**
     * Check if a keyboard event matches a shortcut
     */
    private matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
        // Normalize the key for comparison
        const eventKey = event.key.toLowerCase();
        const shortcutKey = shortcut.key.toLowerCase();

        if (eventKey !== shortcutKey) {
            return false;
        }

        // Check modifier keys
        const ctrlMatch = (shortcut.ctrl ?? false) === (event.ctrlKey || event.metaKey);
        const altMatch = (shortcut.alt ?? false) === event.altKey;
        const shiftMatch = (shortcut.shift ?? false) === event.shiftKey;

        return ctrlMatch && altMatch && shiftMatch;
    }

    /**
     * Get all registered shortcuts
     */
    getBindings(): ShortcutBinding[] {
        return [...this.bindings];
    }

    /**
     * Get shortcuts for a specific command
     */
    getShortcutsForCommand(commandId: string): KeyboardShortcut[] {
        return this.bindings
            .filter(b => b.commandId === commandId)
            .map(b => b.shortcut);
    }

    /**
     * Format a shortcut for display
     */
    static formatShortcut(shortcut: KeyboardShortcut): string {
        const parts: string[] = [];
        
        if (shortcut.ctrl || shortcut.meta) {
            // Use platform-appropriate modifier
            const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
            parts.push(isMac ? '⌘' : 'Ctrl');
        }
        if (shortcut.alt) {
            parts.push('Alt');
        }
        if (shortcut.shift) {
            parts.push('Shift');
        }
        
        parts.push(shortcut.key.toUpperCase());
        
        return parts.join('+');
    }
}
