import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CommandRegistry, ShortcutManager } from './index.js';

describe('Shortcuts System', () => {

    describe('CommandRegistry', () => {
        it('should register and execute commands', async () => {
            const registry = new CommandRegistry();
            let executed = false;

            registry.register({
                id: 'test-cmd',
                label: 'Test Command',
                handler: () => { executed = true; }
            });

            expect(registry.has('test-cmd')).toBe(true);
            await registry.execute('test-cmd');
            expect(executed).toBe(true);
        });

        it('should handle non-existent commands gracefully', async () => {
            const registry = new CommandRegistry();
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const result = await registry.execute('fake-cmd');
            expect(result).toBe(false);
            consoleSpy.mockRestore();
        });
    });

    describe('ShortcutManager', () => {
        let registry: CommandRegistry;
        let manager: ShortcutManager;
        let testContainer: HTMLElement;

        beforeEach(() => {
            registry = new CommandRegistry();
            manager = new ShortcutManager(registry);
            testContainer = document.createElement('div');
            testContainer.tabIndex = 0; // Make it focusable
            document.body.appendChild(testContainer);

            // Activate on the test container
            manager.activate(testContainer);
        });

        afterEach(() => {
            manager.deactivate(testContainer);
            document.body.removeChild(testContainer);
        });

        it('should trigger command via keyboard shortcut', async () => {
            let executed = false;
            registry.register({
                id: 'test-cmd',
                label: 'Test',
                handler: () => { executed = true; }
            });

            manager.register({
                shortcut: 'Ctrl+K',
                commandId: 'test-cmd'
            });

            testContainer.focus();

            // Dispatch keyboard event
            const event = new KeyboardEvent('keydown', {
                key: 'k',
                code: 'KeyK',
                ctrlKey: true,
                bubbles: true,
                cancelable: true
            });

            testContainer.dispatchEvent(event);

            // Shosho handles things slightly asynchronously or directly depending on config,
            // but our handler is synchronous in the callback.
            // However, shosho might have some internal logic.
            // Let's verify immediate execution.
            expect(executed).toBe(true);
        });

        it('should respect input exclusion', async () => {
            let executed = false;
            registry.register({
                id: 'test-cmd',
                label: 'Test',
                handler: () => { executed = true; }
            });

            manager.register({
                shortcut: 'A',
                commandId: 'test-cmd'
            });

            const input = document.createElement('input');
            testContainer.appendChild(input);
            input.focus();

            const event = new KeyboardEvent('keydown', {
                key: 'a',
                code: 'KeyA',
                bubbles: true
            });

            input.dispatchEvent(event);

            expect(executed).toBe(false);
        });
    });
});
