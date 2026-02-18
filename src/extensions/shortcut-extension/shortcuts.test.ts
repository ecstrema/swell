import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CommandExtension } from '../command-extension/command-extension.js';
import { ShortcutExtension } from './shortcut-extension.js';

function makeShortcutExtension(commandExt: CommandExtension): ShortcutExtension {
    const deps = new Map<string, any>([[CommandExtension.metadata.id, commandExt]]);
    return new ShortcutExtension(deps);
}

describe('Shortcuts System', () => {

    describe('CommandExtension', () => {
        it('should register and execute commands', async () => {
            const ext = new CommandExtension(new Map());
            let executed = false;
            ext.register({ id: 'test-cmd', label: 'Test Command', handler: () => { executed = true; } });
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

    describe('ShortcutExtension', () => {
        let commandExt: CommandExtension;
        let shortcutExt: ShortcutExtension;
        let testContainer: HTMLElement;

        beforeEach(() => {
            commandExt = new CommandExtension(new Map());
            shortcutExt = makeShortcutExtension(commandExt);
            testContainer = document.createElement('div');
            testContainer.tabIndex = 0;
            document.body.appendChild(testContainer);
            shortcutExt.attachTo(testContainer);
        });

        afterEach(() => {
            shortcutExt.detachFrom(testContainer);
            document.body.removeChild(testContainer);
        });

        it('should trigger command via keyboard shortcut', async () => {
            let executed = false;
            commandExt.register({ id: 'test-cmd', label: 'Test', handler: () => { executed = true; } });
            shortcutExt.register({ shortcut: 'Ctrl+K', commandId: 'test-cmd' });

            testContainer.focus();
            testContainer.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'k', code: 'KeyK', ctrlKey: true, bubbles: true, cancelable: true
            }));
            expect(executed).toBe(true);
        });

        it('should respect input exclusion', async () => {
            let executed = false;
            commandExt.register({ id: 'test-cmd', label: 'Test', handler: () => { executed = true; } });
            shortcutExt.register({ shortcut: 'A', commandId: 'test-cmd' });

            const input = document.createElement('input');
            testContainer.appendChild(input);
            input.focus();
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA', bubbles: true }));
            expect(executed).toBe(false);
        });
    });
});
