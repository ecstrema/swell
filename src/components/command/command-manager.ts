import { ExtensionRegistry } from "../../extensions/index.js";
import { CommandExtension } from "../../extensions/command-extension/command-extension.js";
import { ShortcutExtension } from "../../extensions/shortcut-extension/shortcut-extension.js";
import { ShortcutManager } from "../../shortcuts/shortcut-manager.js";

/**
 * Manages the command registry, shortcuts, and extensions
 */
export class CommandManager {
    private extensionRegistry: ExtensionRegistry;

    constructor() {
        this.extensionRegistry = new ExtensionRegistry();
    }

    getCommandExtension(): CommandExtension | undefined {
        const extensions = this.extensionRegistry.getExtensions();
        return extensions.find(e => (e.constructor as any).metadata?.id === CommandExtension.metadata.id) as CommandExtension;
    }

    getShortcutManager(): ShortcutManager | undefined {
        const extensions = this.extensionRegistry.getExtensions();
        const shortcutExt = extensions.find(e => (e.constructor as any).metadata?.id === ShortcutExtension.metadata.id) as ShortcutExtension;
        return shortcutExt?.getShortcutManager();
    }

    getExtensionRegistry(): ExtensionRegistry {
        return this.extensionRegistry;
    }

    async deactivate(): Promise<void> {
        const extensions = this.extensionRegistry.getExtensions();
        const ids = extensions.map(e => (e.constructor as any).metadata.id);
        for (const id of ids) {
            await this.extensionRegistry.unregister(id);
        }
    }
}
