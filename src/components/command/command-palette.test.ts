import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CommandRegistry } from '../../shortcuts/command-registry.js';
import { ShortcutManager } from '../../shortcuts/shortcut-manager.js';
import { CommandPalette } from './command-palette.js';

describe('CommandPalette', () => {
    let registry: CommandRegistry;
    let shortcutManager: ShortcutManager;
    let palette: CommandPalette;

    beforeEach(() => {
        registry = new CommandRegistry();
        shortcutManager = new ShortcutManager(registry);

        // Register some test commands
        registry.register({
            id: 'test-command-1',
            label: 'Test Command 1',
            handler: () => {}
        });

        registry.register({
            id: 'test-command-2',
            label: 'Test Command 2',
            handler: () => {}
        });

        registry.register({
            id: 'core/file/open',
            label: 'Open File',
            handler: () => {}
        });

        // Register a shortcut for core/file/open
        shortcutManager.register({
            shortcut: 'Ctrl+O',
            commandId: 'core/file/open'
        });

        palette = new CommandPalette(registry, shortcutManager);
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

        const shadowRoot = palette.shadowRoot;
        expect(shadowRoot).toBeTruthy();

        const resultItems = shadowRoot!.querySelectorAll('.result-item');
        expect(resultItems.length).toBe(3); // All three registered commands
    });

    it('should filter commands based on search query', async () => {
        palette.open();

        const shadowRoot = palette.shadowRoot;
        const searchInput = shadowRoot!.querySelector('.search-input') as HTMLInputElement;

        // Type "file" to filter
        searchInput.value = 'file';
        searchInput.dispatchEvent(new Event('input'));

        // Wait a tick for the filter to apply
        await new Promise(resolve => setTimeout(resolve, 0));

        const resultItems = shadowRoot!.querySelectorAll('.result-item');
        expect(resultItems.length).toBe(1);
        expect(resultItems[0].textContent).toContain('Open File');
    });

    it('should handle keyboard navigation', async () => {
        palette.open();

        const shadowRoot = palette.shadowRoot;
        const searchInput = shadowRoot!.querySelector('.search-input') as HTMLInputElement;

        // First item should be selected by default
        let selectedItem = shadowRoot!.querySelector('.result-item.selected');
        expect(selectedItem).toBeTruthy();

        // Press ArrowDown
        const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        searchInput.dispatchEvent(downEvent);

        await new Promise(resolve => setTimeout(resolve, 0));

        // Second item should now be selected
        const allItems = shadowRoot!.querySelectorAll('.result-item');
        expect(allItems[1].classList.contains('selected')).toBe(true);
    });

    it('should close on Escape key', () => {
        palette.open();

        const shadowRoot = palette.shadowRoot;
        const searchInput = shadowRoot!.querySelector('.search-input') as HTMLInputElement;

        const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
        searchInput.dispatchEvent(escapeEvent);

        expect(palette.classList.contains('open')).toBe(false);
    });

    it('should execute selected command on Enter', async () => {
        let executed = false;

        registry.register({
            id: 'test-execute',
            label: 'Test Execute',
            handler: () => { executed = true; }
        });

        // Recreate palette with new command
        if (palette.parentNode) {
            palette.parentNode.removeChild(palette);
        }
        palette = new CommandPalette(registry, shortcutManager);
        document.body.appendChild(palette);

        palette.open();

        const shadowRoot = palette.shadowRoot;
        const searchInput = shadowRoot!.querySelector('.search-input') as HTMLInputElement;

        // Search for our specific command
        searchInput.value = 'test execute';
        searchInput.dispatchEvent(new Event('input'));

        await new Promise(resolve => setTimeout(resolve, 0));

        // Press Enter
        const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
        searchInput.dispatchEvent(enterEvent);

        expect(executed).toBe(true);
        expect(palette.classList.contains('open')).toBe(false);
    });

    it('should close when clicking overlay', () => {
        palette.open();

        const shadowRoot = palette.shadowRoot;
        const overlay = shadowRoot!.querySelector('.overlay') as HTMLElement;

        overlay.click();

        expect(palette.classList.contains('open')).toBe(false);
    });

    it('should execute command when clicking on result item', async () => {
        let executed = false;

        registry.register({
            id: 'test-click',
            label: 'Test Click',
            handler: () => { executed = true; }
        });

        // Recreate palette with new command
        if (palette.parentNode) {
            palette.parentNode.removeChild(palette);
        }
        palette = new CommandPalette(registry, shortcutManager);
        document.body.appendChild(palette);

        palette.open();

        const shadowRoot = palette.shadowRoot;
        const searchInput = shadowRoot!.querySelector('.search-input') as HTMLInputElement;

        // Search for our specific command
        searchInput.value = 'test click';
        searchInput.dispatchEvent(new Event('input'));

        await new Promise(resolve => setTimeout(resolve, 0));

        const resultItem = shadowRoot!.querySelector('.result-item') as HTMLElement;
        resultItem.click();

        expect(executed).toBe(true);
        expect(palette.classList.contains('open')).toBe(false);
    });

    it('should display shortcuts next to commands that have them', () => {
        palette.open();

        const shadowRoot = palette.shadowRoot;
        expect(shadowRoot).toBeTruthy();

        // Find the core/file/open command result item
        const resultItems = shadowRoot!.querySelectorAll('.result-item');
        let fileOpenItem: Element | null = null;

        for (const item of Array.from(resultItems)) {
            if (item.textContent?.includes('Open File')) {
                fileOpenItem = item;
                break;
            }
        }

        expect(fileOpenItem).toBeTruthy();

        // Check that it has a shortcut display component
        const shortcutDisplay = fileOpenItem!.querySelector('app-shortcut-display');
        expect(shortcutDisplay).toBeTruthy();

        // Check the shortcut text in the shadow root of the component
        const shortcutShadow = shortcutDisplay!.shadowRoot;
        const shortcutEl = shortcutShadow!.querySelector('.shortcut');
        expect(shortcutEl!.textContent).toBe('Control+O');
    });

    it('should not display shortcuts for commands without them', () => {
        palette.open();

        const shadowRoot = palette.shadowRoot;
        expect(shadowRoot).toBeTruthy();

        // Find the test-command-1 result item (which has no shortcut)
        const resultItems = shadowRoot!.querySelectorAll('.result-item');
        let testCommandItem: Element | null = null;

        for (const item of Array.from(resultItems)) {
            if (item.textContent?.includes('Test Command 1')) {
                testCommandItem = item;
                break;
            }
        }

        expect(testCommandItem).toBeTruthy();

        // Check that it does NOT have a shortcut display component
        const shortcutDisplay = testCommandItem!.querySelector('app-shortcut-display');
        expect(shortcutDisplay).toBeNull();
    });

    it('should not show the "Open Command Palette" command in the palette', () => {
        // Register the command palette toggle command (as it would be in the real app)
        registry.register({
            id: 'core/command-palette/toggle',
            label: 'Open Command Palette',
            description: 'Open the command palette to search and execute commands',
            handler: () => {}
        });

        // Recreate palette with the command palette toggle command
        if (palette.parentNode) {
            palette.parentNode.removeChild(palette);
        }
        palette = new CommandPalette(registry, shortcutManager);
        document.body.appendChild(palette);

        palette.open();

        const shadowRoot = palette.shadowRoot;
        expect(shadowRoot).toBeTruthy();

        // Get all result items
        const resultItems = shadowRoot!.querySelectorAll('.result-item');

        // Check that none of the result items contain "Open Command Palette"
        let foundCommandPalette = false;
        for (const item of Array.from(resultItems)) {
            if (item.textContent?.includes('Open Command Palette')) {
                foundCommandPalette = true;
                break;
            }
        }

        expect(foundCommandPalette).toBe(false);

        // Should still show the other 3 commands (test-command-1, test-command-2, core/file/open)
        expect(resultItems.length).toBe(3);
    });
});
