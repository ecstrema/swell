import { Extension } from "../types.js";
import { CommandExtension } from "../command-extension/command-extension.js";
import { KeyboardShortcut, ShortcutBinding } from "./types.js";
import { defaultShortcuts } from "./default-shortcuts.js";
import ShoSho from 'shosho';

/**
 * Manages keyboard shortcuts and delegates execution to CommandExtension.
 * This is the single public API other extensions use for anything shortcut-related.
 */
export class ShortcutExtension implements Extension {
    static readonly metadata = {
        id: 'core/shortcuts',
        name: 'Shortcut Extension',
        description: 'Manages keyboard shortcuts and maps them to commands',
    };
    static readonly dependencies = [CommandExtension];

    private bindings: ShortcutBinding[] = [];
    private commandExecutor: CommandExtension;
    private shosho?: ShoSho;
    private disposers: Map<string, (() => void)[]> = new Map();

    constructor(dependencies: Map<string, Extension>) {
        this.commandExecutor = dependencies.get(CommandExtension.metadata.id) as CommandExtension;
    }

    async activate(): Promise<void> {
        this.registerMany(defaultShortcuts);
        if (typeof document !== 'undefined') {
            this.attachTo(document);
        }
    }

    // ── Shortcut registration ────────────────────────────────────────────────

    register(binding: ShortcutBinding): void {
        this.bindings.push(binding);
        if (this.shosho) {
            this.registerWithShoSho(binding);
        }
    }

    registerMany(bindings: ShortcutBinding[]): void {
        for (const binding of bindings) {
            this.register(binding);
        }
    }

    unregister(commandId: string): void {
        this.bindings = this.bindings.filter(b => b.commandId !== commandId);
        const disposers = this.disposers.get(commandId);
        if (disposers) {
            disposers.forEach(d => d());
            this.disposers.delete(commandId);
        }
    }

    updateShortcut(commandId: string, oldShortcut: KeyboardShortcut, newShortcut: KeyboardShortcut): boolean {
        const index = this.bindings.findIndex(b => b.commandId === commandId && b.shortcut === oldShortcut);
        if (index === -1) return false;
        this.removeShortcut(commandId, oldShortcut);
        this.register({ shortcut: newShortcut, commandId });
        return true;
    }

    removeShortcut(commandId: string, shortcut: KeyboardShortcut): boolean {
        const index = this.bindings.findIndex(b => b.commandId === commandId && b.shortcut === shortcut);
        if (index === -1) return false;
        this.bindings.splice(index, 1);
        const disposers = this.disposers.get(commandId);
        if (disposers) {
            disposers.forEach(d => d());
            this.disposers.delete(commandId);
        }
        if (this.shosho) {
            for (const binding of this.bindings.filter(b => b.commandId === commandId)) {
                this.registerWithShoSho(binding);
            }
        }
        return true;
    }

    isShortcutInUse(shortcut: KeyboardShortcut, excludeCommandId?: string): boolean {
        return this.bindings.some(b =>
            b.shortcut === shortcut && (!excludeCommandId || b.commandId !== excludeCommandId)
        );
    }

    getCommandForShortcut(shortcut: KeyboardShortcut): string | undefined {
        return this.bindings.find(b => b.shortcut === shortcut)?.commandId;
    }

    getBindings(): ShortcutBinding[] {
        return [...this.bindings];
    }

    getShortcutsForCommand(commandId: string): KeyboardShortcut[] {
        return this.bindings.filter(b => b.commandId === commandId).map(b => b.shortcut);
    }

    static formatShortcut(shortcut: KeyboardShortcut): string {
        return ShoSho.format(shortcut);
    }

    // ── Keyboard listening ────────────────────────────────────────────────────

    /** Start intercepting keyboard events on the given target element. */
    attachTo(target: EventTarget): void {
        if (!this.shosho) {
            this.initializeShoSho(target);
        } else if (target !== document) {
            this.initializeShoSho(target);
        }
        this.shosho!.start();
    }

    /** Stop intercepting keyboard events. */
    detachFrom(_target?: EventTarget): void {
        this.shosho?.stop();
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    private initializeShoSho(target: EventTarget): void {
        if (this.shosho) {
            this.shosho.stop();
            this.shosho.reset();
        }
        this.shosho = new ShoSho({
            capture: true,
            target: target as HTMLElement | Document | Window,
            shouldHandleEvent(event: any) {
                const t = event.target as HTMLElement;
                return !(t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
            }
        });
        this.disposers.clear();
        for (const binding of this.bindings) {
            this.registerWithShoSho(binding);
        }
    }

    private registerWithShoSho(binding: ShortcutBinding): void {
        const dispose = this.shosho!.register(binding.shortcut, () => {
            this.commandExecutor.execute(binding.commandId);
            return true;
        });
        if (!this.disposers.has(binding.commandId)) {
            this.disposers.set(binding.commandId, []);
        }
        this.disposers.get(binding.commandId)!.push(dispose);
    }
}
