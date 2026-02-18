/**
 * Extension Registry Tests
 *
 * Tests for extension dependencies and API mechanism
 */

import { describe, it, expect } from 'vitest';
import { ExtensionRegistry } from './extension-registry.js';
import { Extension } from './types.js';

describe('Extension Registry (New Architecture)', () => {

    // Mock Extensions
    class BaseExtension implements Extension {
        static readonly metadata = {
            id: 'test/base',
            name: 'Base Extension',
            description: 'Base dependency',
        };

        isActivated = false;

        constructor(dependencies: Map<string, Extension>) {}

        async activate(): Promise<void> {
            this.isActivated = true;
        }

        getValue(): string {
            return 'base-value';
        }
    }

    class DependentExtension implements Extension {
        static readonly metadata = {
            id: 'test/dependent',
            name: 'Dependent Extension',
            description: 'Depends on base',
        };

        static readonly dependencies = [BaseExtension];

        baseExtension: BaseExtension;
        isActivated = false;

        constructor(dependencies: Map<string, Extension>) {
            this.baseExtension = dependencies.get(BaseExtension.metadata.id) as BaseExtension;
        }

        async activate(): Promise<void> {
            this.isActivated = true;
        }

        getBaseValue(): string {
            return this.baseExtension.getValue();
        }
    }

    class DeepDependentExtension implements Extension {
        static readonly metadata = {
            id: 'test/deep',
            name: 'Deep Dependent Extension',
            description: 'Depends on dependent',
        };

        static readonly dependencies = [DependentExtension];

        dependentExtension: DependentExtension;
        isActivated = false;

        constructor(dependencies: Map<string, Extension>) {
            this.dependentExtension = dependencies.get(DependentExtension.metadata.id) as DependentExtension;
        }

        async activate(): Promise<void> {
            this.isActivated = true;
        }
    }

    it('should register and activate a single extension', async () => {
        const registry = new ExtensionRegistry();
        await registry.register(BaseExtension);

        const extensions = registry.getExtensions();
        expect(extensions.length).toBe(1);

        const instance = extensions[0] as BaseExtension;
        expect(instance).toBeInstanceOf(BaseExtension);
        expect(instance.isActivated).toBe(true);
    });

    it('should resolve dependencies recursively', async () => {
        const registry = new ExtensionRegistry();
        // Registering dependent should trigger registration of Base
        await registry.register(DependentExtension);

        const extensions = registry.getExtensions();
        // Should have Base and Dependent
        expect(extensions.length).toBe(2);

        const baseInstance = extensions.find(e => (e.constructor as any).metadata.id === BaseExtension.metadata.id) as BaseExtension;
        const dependentInstance = extensions.find(e => (e.constructor as any).metadata.id === DependentExtension.metadata.id) as DependentExtension;

        expect(baseInstance).toBeDefined();
        expect(dependentInstance).toBeDefined();

        expect(baseInstance.isActivated).toBe(true);
        expect(dependentInstance.isActivated).toBe(true);

        // Check injection
        expect(dependentInstance.baseExtension).toBe(baseInstance);
        expect(dependentInstance.getBaseValue()).toBe('base-value');
    });

    it('should handle deep dependency chains', async () => {
        const registry = new ExtensionRegistry();
        await registry.register(DeepDependentExtension);

        const extensions = registry.getExtensions();
        expect(extensions.length).toBe(3); // Base, Dependent, Deep

        const deepInstance = extensions.find(e => (e.constructor as any).metadata.id === DeepDependentExtension.metadata.id) as DeepDependentExtension;
        const dependentInstance = extensions.find(e => (e.constructor as any).metadata.id === DependentExtension.metadata.id) as DependentExtension;
        const baseInstance = extensions.find(e => (e.constructor as any).metadata.id === BaseExtension.metadata.id) as BaseExtension;

        expect(deepInstance.dependentExtension).toBe(dependentInstance);
        expect(dependentInstance.baseExtension).toBe(baseInstance);
    });

    it('should not re-instantiate existing extensions', async () => {
        const registry = new ExtensionRegistry();

        // First register base
        await registry.register(BaseExtension);
        const firstBaseInstance = registry.getExtensions()[0];

        // Then register dependent (which depends on Base)
        await registry.register(DependentExtension);

        const extensions = registry.getExtensions();
        const baseInstance = extensions.find(e => (e.constructor as any).metadata.id === BaseExtension.metadata.id);

        // Should be the exact same instance
        expect(baseInstance).toBe(firstBaseInstance);
    });
});
