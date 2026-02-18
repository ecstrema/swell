import { ExtensionRegistry } from "../../extensions/index.js";
import { CommandExtension } from "../../extensions/command-extension/command-extension.js";
import { CommandRegistry } from "../../shortcuts/command-registry.js";
import { ShortcutManager } from "../../shortcuts/shortcut-manager.js";

/**
 * Manages the command registry, shortcuts, and extensions
 */
export class CommandManager {
    private extensionRegistry: ExtensionRegistry;

    constructor() {
        this.extensionRegistry = new ExtensionRegistry();
    }

    /**
     * Get the command registry
     */
    getCommandRegistry(): CommandRegistry | undefined {
        const extensions = this.extensionRegistry.getExtensions();
        // Since CommandExtension is registered by dependency mechanism, we can find it
        // We look for instance of CommandExtension, or by ID if available in metadata
        const cmdExt = extensions.find(e => (e.constructor as any).metadata?.id === CommandExtension.metadata.id) as CommandExtension;
        return cmdExt?.getCommandRegistry();
    }

    /**
     * Get the shortcut manager
     */
    getShortcutManager(): ShortcutManager | undefined {
        const extensions = this.extensionRegistry.getExtensions();
        const cmdExt = extensions.find(e => (e.constructor as any).metadata?.id === CommandExtension.metadata.id) as CommandExtension;
        return cmdExt?.getShortcutManager();
    }

    /**
     * Get the extension registry
     */
    getExtensionRegistry(): ExtensionRegistry {
        return this.extensionRegistry;
    }

    /**
     * Deactivate the command manager and all extensions
     */
    async deactivate(): Promise<void> {
        const extensions = this.extensionRegistry.getExtensions();
        // Deactivate in reverse order of registration might be safer, but parallel is okay for now
        // Or unregister all
        const ids = extensions.map(e => (e.constructor as any).metadata.id);
        for (const id of ids) {
            await this.extensionRegistry.unregister(id);
        }
    }
}
