/**
 * Extension Registry Tests
 * 
 * Tests for extension dependencies and API mechanism
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExtensionRegistry } from './extension-registry.js';
import { Extension, ExtensionContext } from './types.js';
import { CommandRegistry } from '../shortcuts/command-registry.js';
import { ShortcutManager } from '../shortcuts/shortcut-manager.js';

describe('Extension Registry', () => {
    let registry: ExtensionRegistry;
    let commandRegistry: CommandRegistry;
    let shortcutManager: ShortcutManager;

    beforeEach(() => {
        commandRegistry = new CommandRegistry();
        shortcutManager = new ShortcutManager(commandRegistry);
        registry = new ExtensionRegistry(commandRegistry, shortcutManager);
    });

    describe('Extension Dependencies', () => {
        it('should allow extension to request another extension via getExtension', async () => {
            // Create a provider extension that exports an API
            const providerExtension: Extension = {
                metadata: {
                    id: 'test/provider',
                    name: 'Provider Extension',
                },
                activate: async (context: ExtensionContext) => {
                    return {
                        getValue: () => 'test-value',
                    };
                },
            };

            // Create a consumer extension that depends on the provider
            let receivedAPI: any = null;
            const consumerExtension: Extension = {
                metadata: {
                    id: 'test/consumer',
                    name: 'Consumer Extension',
                    dependencies: ['test/provider'],
                },
                activate: async (context: ExtensionContext) => {
                    receivedAPI = await context.getExtension('test/provider');
                },
            };

            // Register provider first
            await registry.register(providerExtension);
            
            // Register consumer
            await registry.register(consumerExtension);

            // Check that consumer received the API
            expect(receivedAPI).toBeDefined();
            expect(receivedAPI.getValue).toBeDefined();
            expect(receivedAPI.getValue()).toBe('test-value');
        });

        it('should return undefined for extension that does not export an API', async () => {
            const extension: Extension = {
                metadata: {
                    id: 'test/no-api',
                    name: 'No API Extension',
                },
                activate: async (context: ExtensionContext) => {
                    // No return value = no API
                },
            };

            await registry.register(extension);
            const api = await registry.getExtension('test/no-api');
            
            expect(api).toBeUndefined();
        });

        it('should return undefined for non-existent extension', async () => {
            const api = await registry.getExtension('test/does-not-exist');
            expect(api).toBeUndefined();
        });

        it('should allow extensions to export complex APIs', async () => {
            interface TestAPI {
                doSomething(): string;
                count: number;
                nested: {
                    getValue(): number;
                };
            }

            const extension: Extension = {
                metadata: {
                    id: 'test/complex-api',
                    name: 'Complex API Extension',
                },
                activate: async (context: ExtensionContext): Promise<TestAPI> => {
                    return {
                        doSomething: () => 'done',
                        count: 42,
                        nested: {
                            getValue: () => 100,
                        },
                    };
                },
            };

            await registry.register(extension);
            const api = await registry.getExtension<TestAPI>('test/complex-api');

            expect(api).toBeDefined();
            expect(api!.doSomething()).toBe('done');
            expect(api!.count).toBe(42);
            expect(api!.nested.getValue()).toBe(100);
        });

        it('should handle multiple extensions requesting the same dependency', async () => {
            const providerExtension: Extension = {
                metadata: {
                    id: 'test/shared-provider',
                    name: 'Shared Provider',
                },
                activate: async () => {
                    return { shared: 'value' };
                },
            };

            let api1: any = null;
            let api2: any = null;

            const consumer1: Extension = {
                metadata: {
                    id: 'test/consumer1',
                    name: 'Consumer 1',
                },
                activate: async (context: ExtensionContext) => {
                    api1 = await context.getExtension('test/shared-provider');
                },
            };

            const consumer2: Extension = {
                metadata: {
                    id: 'test/consumer2',
                    name: 'Consumer 2',
                },
                activate: async (context: ExtensionContext) => {
                    api2 = await context.getExtension('test/shared-provider');
                },
            };

            await registry.register(providerExtension);
            await registry.register(consumer1);
            await registry.register(consumer2);

            expect(api1).toBeDefined();
            expect(api2).toBeDefined();
            expect(api1.shared).toBe('value');
            expect(api2.shared).toBe('value');
            // Both should receive the same API instance
            expect(api1).toBe(api2);
        });
    });

    describe('Extension Registration', () => {
        it('should register an extension', async () => {
            const extension: Extension = {
                metadata: {
                    id: 'test/simple',
                    name: 'Simple Extension',
                },
                activate: async () => {},
            };

            await registry.register(extension);
            const extensions = registry.getExtensions();
            
            expect(extensions).toHaveLength(1);
            expect(extensions[0].metadata.id).toBe('test/simple');
        });

        it('should warn when registering duplicate extension', async () => {
            const extension1: Extension = {
                metadata: {
                    id: 'test/duplicate',
                    name: 'Duplicate Extension',
                },
                activate: async () => {},
            };

            const extension2: Extension = {
                metadata: {
                    id: 'test/duplicate',
                    name: 'Duplicate Extension 2',
                },
                activate: async () => {},
            };

            await registry.register(extension1);
            await registry.register(extension2);

            const extensions = registry.getExtensions();
            expect(extensions).toHaveLength(1);
            expect(extensions[0].metadata.name).toBe('Duplicate Extension');
        });
    });

    describe('Extension Context', () => {
        it('should provide getMetadata to extension', async () => {
            let receivedMetadata: any = null;

            const extension: Extension = {
                metadata: {
                    id: 'test/metadata',
                    name: 'Metadata Test',
                },
                activate: async (context: ExtensionContext) => {
                    receivedMetadata = context.getMetadata();
                },
            };

            await registry.register(extension);

            expect(receivedMetadata).toBeDefined();
            expect(receivedMetadata.id).toBe('test/metadata');
            expect(receivedMetadata.name).toBe('Metadata Test');
        });
    });
});
