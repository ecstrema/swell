import ShoSho from 'shosho';
import { KeyboardShortcut, ShortcutBinding, CommandExecutor } from "./types.js";

/**
 * Manages keyboard shortcuts and maps them to commands
 */
export class ShortcutManager {
    private bindings: ShortcutBinding[] = [];
    private commandRegistry: CommandExecutor;
    private shosho!: ShoSho; // ShoSho instance (initialized lazily in initializeShoSho)
    private disposers: Map<string, (() => void)[]> = new Map();

    constructor(commandRegistry: CommandExecutor) {
        this.commandRegistry = commandRegistry;
        // Don't initialize ShoSho yet - wait until activate() is called
        // This prevents issues in test environments where document might not be available
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
    }

    /**
     * Register a keyboard shortcut binding
     */
    register(binding: ShortcutBinding): void {
        this.bindings.push(binding);
        if (this.shosho) {
            this.registerWithShoSho(binding);
        }
    }

    /**
     * Register multiple shortcut bindings at once
     */
    registerMany(bindings: ShortcutBinding[]): void {
        for (const binding of bindings) {
            this.register(binding);
        }
    }

    /**
     * Unregister all shortcuts for a command ID
     */
    unregister(commandId: string): void {
        // Remove from bindings
        this.bindings = this.bindings.filter(b => b.commandId !== commandId);

        // Dispose shosho handlers
        const disposers = this.disposers.get(commandId);
        if (disposers) {
            disposers.forEach(dispose => dispose());
            this.disposers.delete(commandId);
        }
    }

    /**
     * Update a shortcut for a specific command
     * Removes the old shortcut and registers the new one
     */
    updateShortcut(commandId: string, oldShortcut: KeyboardShortcut, newShortcut: KeyboardShortcut): boolean {
        // Find the binding to update
        const index = this.bindings.findIndex(b => b.commandId === commandId && b.shortcut === oldShortcut);
        if (index === -1) {
            return false; // Binding not found
        }

        // Remove the old binding
        this.removeShortcut(commandId, oldShortcut);

        // Add the new binding
        this.register({ shortcut: newShortcut, commandId });

        return true;
    }

    /**
     * Remove a specific shortcut for a command (useful when a command has multiple shortcuts)
     */
    removeShortcut(commandId: string, shortcut: KeyboardShortcut): boolean {
        const index = this.bindings.findIndex(b => b.commandId === commandId && b.shortcut === shortcut);
        if (index === -1) {
            return false;
        }

        // Remove from bindings
        this.bindings.splice(index, 1);

        // Dispose the specific shosho handler
        // Note: We need to re-register all bindings for this command
        // because we don't track individual disposers per shortcut
        const disposers = this.disposers.get(commandId);
        if (disposers) {
            disposers.forEach(dispose => dispose());
            this.disposers.delete(commandId);
        }

        // Re-register remaining bindings for this command
        if (this.shosho) {
            const remainingBindings = this.bindings.filter(b => b.commandId === commandId);
            for (const binding of remainingBindings) {
                this.registerWithShoSho(binding);
            }
        }

        return true;
    }

    /**
     * Check if a shortcut is already in use by another command
     */
    isShortcutInUse(shortcut: KeyboardShortcut, excludeCommandId?: string): boolean {
        return this.bindings.some(b =>
            b.shortcut === shortcut && (!excludeCommandId || b.commandId !== excludeCommandId)
        );
    }

    /**
     * Get command ID for a shortcut
     */
    getCommandForShortcut(shortcut: KeyboardShortcut): string | undefined {
        const binding = this.bindings.find(b => b.shortcut === shortcut);
        return binding?.commandId;
    }

    /**
     * Start listening for keyboard events
     * @param target - The event target to listen on (defaults to document if available)
     */
    activate(target?: EventTarget): void {
        // Determine the actual target to use
        const eventTarget = target ?? (typeof document !== 'undefined' ? document : null);

        if (!eventTarget) {
            throw new Error('ShortcutManager.activate() requires a target when document is not available');
        }

        // Initialize ShoSho on first activation or when target changes
        if (!this.shosho) {
            this.initializeShoSho(eventTarget);
        } else if (target && target !== document) { // target explicitly provided and differs from document
            this.initializeShoSho(eventTarget);
        }

        this.shosho.start();
    }

    /**
     * Stop listening for keyboard events
     * @param target - The event target (parameter kept for API compatibility but not used)
     */
    deactivate(_target?: EventTarget): void {
        if (this.shosho) {
            this.shosho.stop();
        }
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
        return ShoSho.format(shortcut);
    }
}
