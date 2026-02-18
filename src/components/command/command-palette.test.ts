import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CommandExtension } from '../../extensions/command-extension/command-extension.js';
import { ShortcutManager } from '../../shortcuts/shortcut-manager.js';
import { CommandPalette } from './command-palette.js';

describe('CommandPalette', () => {
    let commandExt: CommandExtension;
    let shortcutManager: ShortcutManager;
    let palette: CommandPalette;

    beforeEach(() => {
        commandExt = new CommandExtension(new Map());
        shortcutManager = new ShortcutManager(commandExt);

        // Register some test commands
        commandExt.register({ id: 'test-command-1', label: 'Test Command 1', handler: () => {} });
        commandExt.register({ id: 'test-command-2', label: 'Test Command 2', handler: () => {} });
        commandExt.register({ id: 'core/file/open', label: 'Open File', handler: () => {} });

        // Register a shortcut for core/file/open
        shortcutManager.register({ shortcut: 'Ctrl+O', commandId: 'core/file/open' });

        palette = new CommandPalette(commandExt, shortcutManager);
        document.body.appendChild(palette);
    });

    afterEach(() => {
        if (palette.parentNode) {
            palette.parentNode.removeChild(palette);
        }
    });

    it('should be hidden by default', () => {
        expect(palette.classList.contains('open')).toBe(false);
    });

    it('should open when open() is called', () => {
        palette.open();
        expect(palette.classList.contains('open')).toBe(true);
    });

    it('should close when close() is called', () => {
        palette.open();
        palette.close();
        expect(palette.classList.contains('open')).toBe(false);
    });

    it('should toggle visibility', () => {
        expect(palette.classList.contains('open')).toBe(false);
        palette.toggle();
        expect(palette.classList.contains('open')).toBe(true);
        palette.toggle();
        expect(palette.classList.contains('open')).toBe(false);
    });

    it('should display all commands when opened with no search query', () => {
        palette.open();
        const resultItems = palette.shadowRoot!.querySelectorAll('.result-item');
        expect(resultItems.length).toBe(3);
    });

    it('should filter commands based on search query', async () => {
        palette.open();
        const searchInput = palette.shadowRoot!.querySelector('.search-input') as HTMLInputElement;
        searchInput.value = 'file';
        searchInput.dispatchEvent(new Event('input'));
        await new Promise(resolve => setTimeout(resolve, 0));
        const resultItems = palette.shadowRoot!.querySelectorAll('.result-item');
        expect(resultItems.length).toBe(1);
        expect(resultItems[0].textContent).toContain('Open File');
    });

    it('should handle keyboard navigation', async () => {
        palette.open();
        const searchInput = palette.shadowRoot!.querySelector('.search-input') as HTMLInputElement;
        expect(palette.shadowRoot!.querySelector('.result-item.selected')).toBeTruthy();
        searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
        await new Promise(resolve => setTimeout(resolve, 0));
        const allItems = palette.shadowRoot!.querySelectorAll('.result-item');
        expect(allItems[1].classList.contains('selected')).toBe(true);
    });

    it('should close on Escape key', () => {
        palette.open();
        const searchInput = palette.shadowRoot!.querySelector('.search-input') as HTMLInputElement;
        searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(palette.classList.contains('open')).toBe(false);
    });

    it('should execute selected command on Enter', async () => {
        let executed = false;
        commandExt.register({ id: 'test-execute', label: 'Test Execute', handler: () => { executed = true; } });

        if (palette.parentNode) palette.parentNode.removeChild(palette);
        palette = new CommandPalette(commandExt, shortcutManager);
        document.body.appendChild(palette);
        palette.open();

        const searchInput = palette.shadowRoot!.querySelector('.search-input') as HTMLInputElement;
        searchInput.value = 'test execute';
        searchInput.dispatchEvent(new Event('input'));
        await new Promise(resolve => setTimeout(resolve, 0));
        searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

        expect(executed).toBe(true);
        expect(palette.classList.contains('open')).toBe(false);
    });

    it('should close when clicking overlay', () => {
        palette.open();
        const overlay = palette.shadowRoot!.querySelector('.overlay') as HTMLElement;
        overlay.click();
        expect(palette.classList.contains('open')).toBe(false);
    });

    it('should execute command when clicking on result item', async () => {
        let executed = false;
        commandExt.register({ id: 'test-click', label: 'Test Click', handler: () => { executed = true; } });

        if (palette.parentNode) palette.parentNode.removeChild(palette);
        palette = new CommandPalette(commandExt, shortcutManager);
        document.body.appendChild(palette);
        palette.open();

        const searchInput = palette.shadowRoot!.querySelector('.search-input') as HTMLInputElement;
        searchInput.value = 'test click';
        searchInput.dispatchEvent(new Event('input'));
        await new Promise(resolve => setTimeout(resolve, 0));

        (palette.shadowRoot!.querySelector('.result-item') as HTMLElement).click();

        expect(executed).toBe(true);
        expect(palette.classList.contains('open')).toBe(false);
    });

    it('should display shortcuts next to commands that have them', () => {
        palette.open();
        const resultItems = palette.shadowRoot!.querySelectorAll('.result-item');
        let fileOpenItem: Element | null = null;
        for (const item of Array.from(resultItems)) {
            if (item.textContent?.includes('Open File')) { fileOpenItem = item; break; }
        }
        expect(fileOpenItem).toBeTruthy();
        const shortcutDisplay = fileOpenItem!.querySelector('app-shortcut-display');
        expect(shortcutDisplay).toBeTruthy();
        const shortcutEl = shortcutDisplay!.shadowRoot!.querySelector('.shortcut');
        expect(shortcutEl!.textContent).toBe('Control+O');
    });

    it('should not display shortcuts for commands without them', () => {
        palette.open();
        const resultItems = palette.shadowRoot!.querySelectorAll('.result-item');
        let testCommandItem: Element | null = null;
        for (const item of Array.from(resultItems)) {
            if (item.textContent?.includes('Test Command 1')) { testCommandItem = item; break; }
        }
        expect(testCommandItem).toBeTruthy();
        expect(testCommandItem!.querySelector('app-shortcut-display')).toBeNull();
    });

    it('should not show the "Open Command Palette" command in the palette', () => {
        commandExt.register({
            id: 'core/command-palette/toggle',
            label: 'Open Command Palette',
            description: 'Open the command palette to search and execute commands',
            handler: () => {}
        });

        if (palette.parentNode) palette.parentNode.removeChild(palette);
        palette = new CommandPalette(commandExt, shortcutManager);
        document.body.appendChild(palette);
        palette.open();

        const resultItems = palette.shadowRoot!.querySelectorAll('.result-item');
        let foundCommandPalette = false;
        for (const item of Array.from(resultItems)) {
            if (item.textContent?.includes('Open Command Palette')) { foundCommandPalette = true; break; }
        }
        expect(foundCommandPalette).toBe(false);
        expect(resultItems.length).toBe(3);
    });
});
