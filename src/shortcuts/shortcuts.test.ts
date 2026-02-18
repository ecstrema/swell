import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CommandExtension, ShortcutManager } from './index.js';

describe('Shortcuts System', () => {

    describe('CommandExtension', () => {
        it('should register and execute commands', async () => {
            const ext = new CommandExtension(new Map());
            let executed = false;

            ext.register({
                id: 'test-cmd',
                label: 'Test Command',
                handler: () => { executed = true; }
            });

            expect(ext.has('test-cmd')).toBe(true);
            await ext.execute('test-cmd');
            expect(executed).toBe(true);
        });

        it('should handle non-existent commands gracefully', async () => {
            const ext = new CommandExtension(new Map());
            const result = await ext.execute('fake-cmd');
            expect(result).toBe(false);
        });
    });

    describe('ShortcutManager', () => {
        let commandExt: CommandExtension;
        let manager: ShortcutManager;
        let testContainer: HTMLElement;

        beforeEach(() => {
            commandExt = new CommandExtension(new Map());
            manager = new ShortcutManager(commandExt);
            testContainer = document.createElement('div');
            testContainer.tabIndex = 0;
            document.body.appendChild(testContainer);
            manager.activate(testContainer);
        });

        afterEach(() => {
            manager.deactivate(testContainer);
            document.body.removeChild(testContainer);
        });

        it('should trigger command via keyboard shortcut', async () => {
            let executed = false;
            commandExt.register({
                id: 'test-cmd',
                label: 'Test',
                handler: () => { executed = true; }
            });

            manager.register({ shortcut: 'Ctrl+K', commandId: 'test-cmd' });

            testContainer.focus();

            const event = new KeyboardEvent('keydown', {
                key: 'k',
                code: 'KeyK',
                ctrlKey: true,
                bubbles: true,
                cancelable: true
            });

            testContainer.dispatchEvent(event);
            expect(executed).toBe(true);
        });

        it('should respect input exclusion', async () => {
            let executed = false;
            commandExt.register({
                id: 'test-cmd',
                label: 'Test',
                handler: () => { executed = true; }
            });

            manager.register({ shortcut: 'A', commandId: 'test-cmd' });

            const input = document.createElement('input');
            testContainer.appendChild(input);
            input.focus();

            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA', bubbles: true }));
            expect(executed).toBe(false);
        });
    });
});
