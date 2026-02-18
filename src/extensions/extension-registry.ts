/**
 * Extension Registry
 *
 * Central registry for managing extensions and their registrations.
 * Provides a unified interface for extensions to register commands, menus, pages, settings, and themes.
 */

import {
    Extension,
    ExtensionId,
    ExtensionConstructor
} from "./types.js";

/**
 * Central registry for all extensions
 */
export class ExtensionRegistry {
    private extensions: Map<ExtensionId, Extension> = new Map();
    private extensionAPIs: Map<ExtensionId, any> = new Map();

    /**
     * Register an extension class and recursively its dependencies
     */
    async register(ExtensionClass: ExtensionConstructor): Promise<void> {
        const id = ExtensionClass.metadata.id;

        if (this.extensions.has(id)) {
            // Already registered
            return;
        }

        const dependencyMap = new Map<string, Extension>();

        // Handle dependencies
        if (ExtensionClass.dependencies && Array.isArray(ExtensionClass.dependencies)) {
            for (const DepClass of ExtensionClass.dependencies) {
                // Ensure dependency is registered
                await this.register(DepClass);

                // Get the instance
                const depId = DepClass.metadata.id;
                const depInstance = this.extensions.get(depId);
                if (depInstance) {
                    dependencyMap.set(depId, depInstance);
                } else {
                    console.error(`Failed to resolve dependency ${depId} for ${id}`);
                }
            }
        }

        // Instantiate
        const extension = new ExtensionClass(dependencyMap);
        this.extensions.set(id, extension);

        // Activate
        const api = await extension.activate();
        if (api !== undefined) {
            this.extensionAPIs.set(id, api);
        }
    }

    /**
     * Get an extension API by ID
     */
    async getExtension<T = any>(extensionId: ExtensionId): Promise<T | undefined> {
        return this.extensionAPIs.get(extensionId) as T;
    }

    /**
     * Unregister an extension
     */
    async unregister(extensionId: ExtensionId): Promise<void> {
        const extension = this.extensions.get(extensionId);
        if (!extension) {
            return;
        }

        if (extension.deactivate) {
            await extension.deactivate();
        }

        this.extensions.delete(extensionId);
        this.extensionAPIs.delete(extensionId);
    }

    /**
     * Get all registered extensions
     */
    getExtensions(): Extension[] {
        return Array.from(this.extensions.values());
    }
}
