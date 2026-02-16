import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ShortcutDisplay } from './shortcut-display.js';

describe('ShortcutDisplay', () => {
    let shortcutDisplay: ShortcutDisplay;

    beforeEach(() => {
        shortcutDisplay = new ShortcutDisplay();
        document.body.appendChild(shortcutDisplay);
    });

    afterEach(() => {
        if (shortcutDisplay.parentNode) {
            shortcutDisplay.parentNode.removeChild(shortcutDisplay);
        }
    });

    it('should create a shortcut display component', () => {
        expect(shortcutDisplay).toBeTruthy();
        expect(shortcutDisplay.shadowRoot).toBeTruthy();
    });

    it('should display empty when no shortcut is set', () => {
        const shadowRoot = shortcutDisplay.shadowRoot;
        expect(shadowRoot!.innerHTML.trim()).toBe('');
    });

    it('should display shortcut when set programmatically', () => {
        shortcutDisplay.setShortcut('Control+K');
        
        const shadowRoot = shortcutDisplay.shadowRoot;
        const shortcutEl = shadowRoot!.querySelector('.shortcut');
        
        expect(shortcutEl).toBeTruthy();
        expect(shortcutEl!.textContent).toBe('Control+K');
    });

    it('should update shortcut when changed', () => {
        shortcutDisplay.setShortcut('Control+K');
        
        let shadowRoot = shortcutDisplay.shadowRoot;
        let shortcutEl = shadowRoot!.querySelector('.shortcut');
        expect(shortcutEl!.textContent).toBe('Control+K');

        shortcutDisplay.setShortcut('Control+Shift+P');
        
        shadowRoot = shortcutDisplay.shadowRoot;
        shortcutEl = shadowRoot!.querySelector('.shortcut');
        expect(shortcutEl!.textContent).toBe('Control+Shift+P');
    });

    it('should display shortcut when set via attribute', () => {
        shortcutDisplay.setAttribute('shortcut', 'Control+O');
        
        const shadowRoot = shortcutDisplay.shadowRoot;
        const shortcutEl = shadowRoot!.querySelector('.shortcut');
        
        expect(shortcutEl).toBeTruthy();
        expect(shortcutEl!.textContent).toBe('Control+O');
    });

    it('should get the current shortcut', () => {
        shortcutDisplay.setShortcut('Control+A');
        expect(shortcutDisplay.getShortcut()).toBe('Control+A');
    });

    it('should handle empty shortcut gracefully', () => {
        shortcutDisplay.setShortcut('Control+K');
        shortcutDisplay.setShortcut('');
        
        const shadowRoot = shortcutDisplay.shadowRoot;
        expect(shadowRoot!.innerHTML.trim()).toBe('');
    });

    it('should escape HTML in shortcuts', () => {
        shortcutDisplay.setShortcut('<script>alert("xss")</script>');
        
        const shadowRoot = shortcutDisplay.shadowRoot;
        const shortcutEl = shadowRoot!.querySelector('.shortcut');
        
        // Should be escaped, not executed
        expect(shortcutEl!.textContent).toBe('<script>alert("xss")</script>');
        expect(shortcutEl!.innerHTML).not.toContain('<script>');
    });
});
