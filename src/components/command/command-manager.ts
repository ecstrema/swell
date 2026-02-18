import { ExtensionRegistry } from "../../extensions/index.js";
import { CommandExtension } from "../../extensions/command-extension/command-extension.js";
import { ShortcutExtension } from "../../extensions/shortcut-extension/shortcut-extension.js";

export class CommandManager {
    private extensionRegistry: ExtensionRegistry;

    constructor() {
        this.extensionRegistry = new ExtensionRegistry();
    }

    getCommandExtension(): CommandExtension | undefined {
        return this.extensionRegistry.getExtensions()
            .find(e => (e.constructor as any).metadata?.id === CommandExtension.metadata.id) as CommandExtension;
    }

    getShortcutExtension(): ShortcutExtension | undefined {
        return this.extensionRegistry.getExtensions()
            .find(e => (e.constructor as any).metadata?.id === ShortcutExtension.metadata.id) as ShortcutExtension;
    }

    getExtensionRegistry(): ExtensionRegistry {
        return this.extensionRegistry;
    }

    async deactivate(): Promise<void> {
        const ids = this.extensionRegistry.getExtensions()
            .map(e => (e.constructor as any).metadata.id);
        for (const id of ids) {
            await this.extensionRegistry.unregister(id);
        }
    }
}
