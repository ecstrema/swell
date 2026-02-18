import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CommandExtension } from '../command-extension/command-extension.js';
import { ShortcutExtension } from '../shortcut-extension/shortcut-extension.js';
import { CommandPalette } from './command-palette.js';

function makeShortcutExtension(commandExt: CommandExtension): ShortcutExtension {
    const deps = new Map<string, any>([[CommandExtension.metadata.id, commandExt]]);
    return new ShortcutExtension(deps);
}

describe('CommandPalette', () => {
    let commandExt: CommandExtension;
    let shortcutExt: ShortcutExtension;
    let palette: CommandPalette;

    beforeEach(() => {
        commandExt = new CommandExtension(new Map());
        shortcutExt = makeShortcutExtension(commandExt);

        commandExt.register({ id: 'test-command-1', label: 'Test Command 1', handler: () => {} });
        commandExt.register({ id: 'test-command-2', label: 'Test Command 2', handler: () => {} });
        commandExt.register({ id: 'core/file/open', label: 'Open File', handler: () => {} });
        shortcutExt.register({ shortcut: 'Ctrl+O', commandId: 'core/file/open' });

        palette = new CommandPalette(commandExt, shortcutExt);
        document.body.appendChild(palette);
    });

    afterEach(() => {
        if (palette.parentNode) palette.parentNode.removeChild(palette);
    });

    it('should be hidden by default', () => {
        expect(palette.classList.contains('open')).toBe(false);
    });

    it('should open when open() is called', () => {
        palette.open();
        expect(palette.classList.contains('open')).toBe(true);
    });

    it('should close when close() is called', () => {
        palette.open(); palette.close();
        expect(palette.classList.contains('open')).toBe(false);
    });

    it('should toggle visibility', () => {
        expect(palette.classList.contains('open')).toBe(false);
        palette.toggle(); expect(palette.classList.contains('open')).toBe(true);
        palette.toggle(); expect(palette.classList.contains('open')).toBe(false);
    });

    it('should display all commands when opened with no search query', () => {
        palette.open();
        expect(palette.shadowRoot!.querySelectorAll('.result-item').length).toBe(3);
    });

    it('should filter commands based on search query', async () => {
        palette.open();
        const input = palette.shadowRoot!.querySelector('.search-input') as HTMLInputElement;
        input.value = 'file'; input.dispatchEvent(new Event('input'));
        await new Promise(r => setTimeout(r, 0));
        const items = palette.shadowRoot!.querySelectorAll('.result-item');
        expect(items.length).toBe(1);
        expect(items[0].textContent).toContain('Open File');
    });

    it('should handle keyboard navigation', async () => {
        palette.open();
        const input = palette.shadowRoot!.querySelector('.search-input') as HTMLInputElement;
        expect(palette.shadowRoot!.querySelector('.result-item.selected')).toBeTruthy();
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
        await new Promise(r => setTimeout(r, 0));
        expect(palette.shadowRoot!.querySelectorAll('.result-item')[1].classList.contains('selected')).toBe(true);
    });

    it('should close on Escape key', () => {
        palette.open();
        (palette.shadowRoot!.querySelector('.search-input') as HTMLInputElement)
            .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(palette.classList.contains('open')).toBe(false);
    });

    it('should execute selected command on Enter', async () => {
        let executed = false;
        commandExt.register({ id: 'test-execute', label: 'Test Execute', handler: () => { executed = true; } });
        if (palette.parentNode) palette.parentNode.removeChild(palette);
        palette = new CommandPalette(commandExt, shortcutExt);
        document.body.appendChild(palette);
        palette.open();
        const input = palette.shadowRoot!.querySelector('.search-input') as HTMLInputElement;
        input.value = 'test execute'; input.dispatchEvent(new Event('input'));
        await new Promise(r => setTimeout(r, 0));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        expect(executed).toBe(true);
        expect(palette.classList.contains('open')).toBe(false);
    });

    it('should close when clicking overlay', () => {
        palette.open();
        (palette.shadowRoot!.querySelector('.overlay') as HTMLElement).click();
        expect(palette.classList.contains('open')).toBe(false);
    });

    it('should execute command when clicking on result item', async () => {
        let executed = false;
        commandExt.register({ id: 'test-click', label: 'Test Click', handler: () => { executed = true; } });
        if (palette.parentNode) palette.parentNode.removeChild(palette);
        palette = new CommandPalette(commandExt, shortcutExt);
        document.body.appendChild(palette);
        palette.open();
        const input = palette.shadowRoot!.querySelector('.search-input') as HTMLInputElement;
        input.value = 'test click'; input.dispatchEvent(new Event('input'));
        await new Promise(r => setTimeout(r, 0));
        (palette.shadowRoot!.querySelector('.result-item') as HTMLElement).click();
        expect(executed).toBe(true);
        expect(palette.classList.contains('open')).toBe(false);
    });

    it('should display shortcuts next to commands that have them', () => {
        palette.open();
        const items = Array.from(palette.shadowRoot!.querySelectorAll('.result-item'));
        const fileOpenItem = items.find(i => i.textContent?.includes('Open File'));
        expect(fileOpenItem).toBeTruthy();
        const sd = fileOpenItem!.querySelector('app-shortcut-display');
        expect(sd).toBeTruthy();
        expect(sd!.shadowRoot!.querySelector('.shortcut')!.textContent).toBe('Control+O');
    });

    it('should not display shortcuts for commands without them', () => {
        palette.open();
        const items = Array.from(palette.shadowRoot!.querySelectorAll('.result-item'));
        const item = items.find(i => i.textContent?.includes('Test Command 1'));
        expect(item).toBeTruthy();
        expect(item!.querySelector('app-shortcut-display')).toBeNull();
    });

    it('should not show the "Open Command Palette" command in the palette', () => {
        commandExt.register({ id: 'core/command-palette/toggle', label: 'Open Command Palette', description: 'Open the command palette to search and execute commands', handler: () => {} });
        if (palette.parentNode) palette.parentNode.removeChild(palette);
        palette = new CommandPalette(commandExt, shortcutExt);
        document.body.appendChild(palette);
        palette.open();
        const items = Array.from(palette.shadowRoot!.querySelectorAll('.result-item'));
        expect(items.some(i => i.textContent?.includes('Open Command Palette'))).toBe(false);
        expect(items.length).toBe(3);
    });
});
