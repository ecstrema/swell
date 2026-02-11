<<<<<<< HEAD
=======
import ShoSho from 'shosho';
>>>>>>> 2d7e45fc37b474692ee546390cf425d4e56b1936
import { KeyboardShortcut, ShortcutBinding } from "./types.js";
import { CommandRegistry } from "./command-registry.js";

/**
 * Manages keyboard shortcuts and maps them to commands
 */
export class ShortcutManager {
    private bindings: ShortcutBinding[] = [];
    private commandRegistry: CommandRegistry;
<<<<<<< HEAD
    private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

    constructor(commandRegistry: CommandRegistry) {
        this.commandRegistry = commandRegistry;
=======
    private shosho: ShoSho; // ShoSho instance
    private disposers: Map<string, (() => void)[]> = new Map();

    constructor(commandRegistry: CommandRegistry) {
        this.commandRegistry = commandRegistry;
        this.initializeShoSho(document);
    }

    private initializeShoSho(target: EventTarget) {
        if (this.shosho) {
            this.shosho.stop();
            this.shosho.reset();
        }

        this.shosho = new ShoSho({
            capture: true,
            target: target as HTMLElement | Document | Window,
            shouldHandleEvent(event: any) {
                // Don't trigger shortcuts when typing in input fields
                const target = event.target as HTMLElement;
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                    return false;
                }
                return true;
            }
        });

        // Re-register existing bindings
        this.disposers.clear();
        for (const binding of this.bindings) {
            this.registerWithShoSho(binding);
        }
    }

    private registerWithShoSho(binding: ShortcutBinding) {
        const handler = () => {
             this.commandRegistry.execute(binding.commandId);
             return true; // We handled it
        };

        const dispose = this.shosho.register(binding.shortcut, handler);

        if (!this.disposers.has(binding.commandId)) {
            this.disposers.set(binding.commandId, []);
        }
        this.disposers.get(binding.commandId)!.push(dispose);
>>>>>>> 2d7e45fc37b474692ee546390cf425d4e56b1936
    }

    /**
     * Register a keyboard shortcut binding
     */
    register(binding: ShortcutBinding): void {
        this.bindings.push(binding);
<<<<<<< HEAD
=======
        if (this.shosho) {
            this.registerWithShoSho(binding);
        }
>>>>>>> 2d7e45fc37b474692ee546390cf425d4e56b1936
    }

    /**
     * Register multiple shortcut bindings at once
     */
    registerMany(bindings: ShortcutBinding[]): void {
<<<<<<< HEAD
        this.bindings.push(...bindings);
=======
        for (const binding of bindings) {
            this.register(binding);
        }
>>>>>>> 2d7e45fc37b474692ee546390cf425d4e56b1936
    }

    /**
     * Unregister a shortcut by command ID
     */
    unregister(commandId: string): void {
<<<<<<< HEAD
        this.bindings = this.bindings.filter(b => b.commandId !== commandId);
=======
        // Remove from bindings
        this.bindings = this.bindings.filter(b => b.commandId !== commandId);

        // Dispose shosho handlers
        const disposers = this.disposers.get(commandId);
        if (disposers) {
            disposers.forEach(dispose => dispose());
            this.disposers.delete(commandId);
        }
>>>>>>> 2d7e45fc37b474692ee546390cf425d4e56b1936
    }

    /**
     * Start listening for keyboard events
     */
    activate(target: EventTarget = document): void {
<<<<<<< HEAD
        if (this.keydownHandler) {
            this.deactivate(target);
        }

        this.keydownHandler = (e: KeyboardEvent) => {
            this.handleKeyDown(e);
        };

        target.addEventListener('keydown', this.keydownHandler);
=======
        // If target differs, we might need to re-init
        // We access internal options if available, otherwise just rely on re-init behavior if we could detect valid target change
        // For simplicity: if target is passed and it is not document (default), we re-init.
        if (target !== document) { // simplified check
             this.initializeShoSho(target);
        }

        this.shosho.start();
>>>>>>> 2d7e45fc37b474692ee546390cf425d4e56b1936
    }

    /**
     * Stop listening for keyboard events
     */
    deactivate(target: EventTarget = document): void {
<<<<<<< HEAD
        if (this.keydownHandler) {
            target.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
=======
        if (this.shosho) {
            this.shosho.stop();
>>>>>>> 2d7e45fc37b474692ee546390cf425d4e56b1936
        }
    }

    /**
<<<<<<< HEAD
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
        // Handle ctrl/meta properly: if ctrl or meta is specified, match against appropriate platform key
        const wantsCtrlOrMeta = (shortcut.ctrl ?? false) || (shortcut.meta ?? false);
        const hasCtrlOrMeta = event.ctrlKey || event.metaKey;
        const ctrlMatch = wantsCtrlOrMeta === hasCtrlOrMeta;
        
        const altMatch = (shortcut.alt ?? false) === event.altKey;
        const shiftMatch = (shortcut.shift ?? false) === event.shiftKey;

        return ctrlMatch && altMatch && shiftMatch;
    }

    /**
=======
>>>>>>> 2d7e45fc37b474692ee546390cf425d4e56b1936
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
<<<<<<< HEAD
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
=======
        return ShoSho.format(shortcut);
>>>>>>> 2d7e45fc37b474692ee546390cf425d4e56b1936
    }
}
