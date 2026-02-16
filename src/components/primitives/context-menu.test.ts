import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ContextMenu, ContextMenuItem } from './context-menu.js';

describe('ContextMenu', () => {
    let menu: ContextMenu;

    beforeEach(() => {
        menu = new ContextMenu();
        document.body.appendChild(menu);
    });

    afterEach(() => {
        if (menu.parentNode) {
            menu.parentNode.removeChild(menu);
        }
    });

    it('should render without errors', () => {
        expect(menu).toBeTruthy();
        expect(menu.shadowRoot).toBeTruthy();
    });

    it('should be hidden by default', () => {
        expect(menu.classList.contains('open')).toBe(false);
    });

    it('should open when open() is called', () => {
        menu.open(100, 100);
        expect(menu.classList.contains('open')).toBe(true);
    });

    it('should close when close() is called', () => {
        menu.open(100, 100);
        menu.close();
        expect(menu.classList.contains('open')).toBe(false);
    });

    it('should toggle visibility', () => {
        expect(menu.classList.contains('open')).toBe(false);
        menu.toggle(100, 100);
        expect(menu.classList.contains('open')).toBe(true);
        menu.toggle(100, 100);
        expect(menu.classList.contains('open')).toBe(false);
    });

    it('should display empty state when no items', () => {
        menu.items = [];
        const shadowRoot = menu.shadowRoot;
        expect(shadowRoot?.textContent).toContain('No items');
    });

    it('should render menu items', () => {
        const items: ContextMenuItem[] = [
            { id: 'item1', label: 'Item 1' },
            { id: 'item2', label: 'Item 2' },
            { id: 'item3', label: 'Item 3' }
        ];

        menu.items = items;

        const shadowRoot = menu.shadowRoot;
        expect(shadowRoot?.textContent).toContain('Item 1');
        expect(shadowRoot?.textContent).toContain('Item 2');
        expect(shadowRoot?.textContent).toContain('Item 3');
    });

    it('should call handler when menu item is clicked', () => {
        const handler = vi.fn();
        const items: ContextMenuItem[] = [
            { id: 'test-item', label: 'Test Item', handler }
        ];

        menu.items = items;
        menu.open(100, 100);

        const shadowRoot = menu.shadowRoot;
        const menuItem = shadowRoot?.querySelector('.menu-item') as HTMLElement;
        expect(menuItem).toBeTruthy();

        menuItem.click();

        expect(handler).toHaveBeenCalled();
    });

    it('should close after clicking a menu item', () => {
        const items: ContextMenuItem[] = [
            { id: 'test-item', label: 'Test Item', handler: () => {} }
        ];

        menu.items = items;
        menu.open(100, 100);

        const shadowRoot = menu.shadowRoot;
        const menuItem = shadowRoot?.querySelector('.menu-item') as HTMLElement;
        menuItem.click();

        expect(menu.classList.contains('open')).toBe(false);
    });

    it('should not call handler for disabled items', () => {
        const handler = vi.fn();
        const items: ContextMenuItem[] = [
            { id: 'disabled-item', label: 'Disabled Item', disabled: true, handler }
        ];

        menu.items = items;

        const shadowRoot = menu.shadowRoot;
        const menuItem = shadowRoot?.querySelector('.menu-item') as HTMLElement;
        expect(menuItem).toBeTruthy();
        expect(menuItem.classList.contains('disabled')).toBe(true);

        menuItem.click();

        expect(handler).not.toHaveBeenCalled();
    });

    it('should render separators', () => {
        const items: ContextMenuItem[] = [
            { id: 'item1', label: 'Item 1' },
            { id: 'sep1', label: '', separator: true },
            { id: 'item2', label: 'Item 2' }
        ];

        menu.items = items;

        const shadowRoot = menu.shadowRoot;
        const separator = shadowRoot?.querySelector('.menu-separator');
        expect(separator).toBeTruthy();
    });

    it('should position menu at specified coordinates', () => {
        const x = 150;
        const y = 200;

        menu.items = [{ id: 'item1', label: 'Item 1' }];
        menu.open(x, y);

        const shadowRoot = menu.shadowRoot;
        const menuContainer = shadowRoot?.querySelector('.menu-container') as HTMLElement;
        expect(menuContainer).toBeTruthy();

        // Note: The exact position might be adjusted by the viewport bounds logic
        // so we just check that the menu has position styles set
        expect(menuContainer.style.left).toBeTruthy();
        expect(menuContainer.style.top).toBeTruthy();
    });

    it('should update items when items property is set', () => {
        const items1: ContextMenuItem[] = [
            { id: 'item1', label: 'Item 1' }
        ];
        const items2: ContextMenuItem[] = [
            { id: 'item2', label: 'Item 2' },
            { id: 'item3', label: 'Item 3' }
        ];

        menu.items = items1;
        let shadowRoot = menu.shadowRoot;
        expect(shadowRoot?.textContent).toContain('Item 1');

        menu.items = items2;
        shadowRoot = menu.shadowRoot;
        expect(shadowRoot?.textContent).toContain('Item 2');
        expect(shadowRoot?.textContent).toContain('Item 3');
        expect(shadowRoot?.textContent).not.toContain('Item 1');
    });
});
