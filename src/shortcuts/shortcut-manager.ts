import ShoSho from 'shosho';
import { KeyboardShortcut, ShortcutBinding } from "./types.js";
import { CommandRegistry } from "./command-registry.js";

/**
 * Manages keyboard shortcuts and maps them to commands
 */
export class ShortcutManager {
    private bindings: ShortcutBinding[] = [];
    private commandRegistry: CommandRegistry;
    private shosho: ShoSho; // ShoSho instance
    private disposers: Map<string, (() => void)[]> = new Map();

    constructor(commandRegistry: CommandRegistry) {
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
     * Unregister a shortcut by command ID
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
