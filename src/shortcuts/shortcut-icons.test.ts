import { describe, it, expect } from 'vitest';
import { renderShortcutWithIcons, renderShortcutWithIconsAsHTML } from './shortcut-icons.js';

describe('shortcut-icons', () => {
    describe('renderShortcutWithIcons', () => {
        it('should render a simple shortcut', () => {
            const shortcut = { key: 'o', ctrl: true };
            const element = renderShortcutWithIcons(shortcut);
            
            expect(element).toBeInstanceOf(HTMLElement);
            expect(element.className).toBe('keyboard-shortcut');
            expect(element.children.length).toBeGreaterThan(0);
        });

        it('should render shortcut with multiple modifiers', () => {
            const shortcut = { key: 'z', ctrl: true, shift: true };
            const element = renderShortcutWithIcons(shortcut);
            
            expect(element).toBeInstanceOf(HTMLElement);
            expect(element.className).toBe('keyboard-shortcut');
            // Should have child elements for the shortcut parts
            expect(element.children.length).toBeGreaterThan(0);
        });

        it('should render shortcut with alt modifier', () => {
            const shortcut = { key: 'f4', alt: true };
            const element = renderShortcutWithIcons(shortcut);
            
            expect(element).toBeInstanceOf(HTMLElement);
            expect(element.children.length).toBeGreaterThan(0);
        });

        it('should render shortcut with meta modifier', () => {
            const shortcut = { key: 's', meta: true };
            const element = renderShortcutWithIcons(shortcut);
            
            expect(element).toBeInstanceOf(HTMLElement);
            expect(element.children.length).toBeGreaterThan(0);
        });
    });

    describe('renderShortcutWithIconsAsHTML', () => {
        it('should return HTML string', () => {
            const shortcut = { key: 'o', ctrl: true };
            const html = renderShortcutWithIconsAsHTML(shortcut);
            
            expect(typeof html).toBe('string');
            expect(html).toContain('keyboard-shortcut');
        });

        it('should include shortcut elements', () => {
            const shortcut = { key: 'z', ctrl: true, shift: true };
            const html = renderShortcutWithIconsAsHTML(shortcut);
            
            expect(html).toContain('keyboard-shortcut');
            expect(html).toContain('shortcut-');
        });
    });
});
