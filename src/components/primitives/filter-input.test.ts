import { describe, it, expect, beforeEach, vi } from 'vitest';
import './filter-input.js';
import { FilterInput, FilterChangeEvent } from './filter-input.js';

describe('FilterInput Component', () => {
    let element: FilterInput;

    beforeEach(() => {
        element = document.createElement('filter-input') as FilterInput;
        document.body.appendChild(element);
    });

    it('should render without errors', () => {
        expect(element).toBeTruthy();
        expect(element.shadowRoot).toBeTruthy();
    });

    it('should have input field', () => {
        const shadowRoot = element.shadowRoot;
        const input = shadowRoot?.querySelector('.filter-input') as HTMLInputElement;
        expect(input).toBeTruthy();
        expect(input.type).toBe('text');
    });

    it('should have three toggle buttons', () => {
        const shadowRoot = element.shadowRoot;
        const buttons = shadowRoot?.querySelectorAll('.filter-toggle');
        expect(buttons?.length).toBe(3);
    });

    it('should get and set query', () => {
        element.query = 'test query';
        expect(element.query).toBe('test query');
    });

    it('should emit filter-change event when input changes', async () => {
        const handler = vi.fn();
        element.addEventListener('filter-change', handler);

        const shadowRoot = element.shadowRoot;
        const input = shadowRoot?.querySelector('.filter-input') as HTMLInputElement;
        
        input.value = 'search text';
        input.dispatchEvent(new Event('input'));

        expect(handler).toHaveBeenCalled();
        const event = handler.mock.calls[0][0] as CustomEvent<FilterChangeEvent>;
        expect(event.detail.query).toBe('search text');
    });

    it('should emit filter-change event when case sensitive is toggled', () => {
        const handler = vi.fn();
        element.addEventListener('filter-change', handler);

        const shadowRoot = element.shadowRoot;
        const buttons = shadowRoot?.querySelectorAll('.filter-toggle');
        const caseSensitiveButton = buttons?.[0] as HTMLButtonElement;

        // Initially false
        expect(element.getOptions().caseSensitive).toBe(false);

        // Click to toggle
        caseSensitiveButton.click();

        expect(handler).toHaveBeenCalled();
        const event = handler.mock.calls[0][0] as CustomEvent<FilterChangeEvent>;
        expect(event.detail.options.caseSensitive).toBe(true);
        expect(element.getOptions().caseSensitive).toBe(true);
    });

    it('should emit filter-change event when whole word is toggled', () => {
        const handler = vi.fn();
        element.addEventListener('filter-change', handler);

        const shadowRoot = element.shadowRoot;
        const buttons = shadowRoot?.querySelectorAll('.filter-toggle');
        const wholeWordButton = buttons?.[1] as HTMLButtonElement;

        // Initially false
        expect(element.getOptions().wholeWord).toBe(false);

        // Click to toggle
        wholeWordButton.click();

        expect(handler).toHaveBeenCalled();
        const event = handler.mock.calls[0][0] as CustomEvent<FilterChangeEvent>;
        expect(event.detail.options.wholeWord).toBe(true);
        expect(element.getOptions().wholeWord).toBe(true);
    });

    it('should emit filter-change event when regex is toggled', () => {
        const handler = vi.fn();
        element.addEventListener('filter-change', handler);

        const shadowRoot = element.shadowRoot;
        const buttons = shadowRoot?.querySelectorAll('.filter-toggle');
        const regexButton = buttons?.[2] as HTMLButtonElement;

        // Initially false
        expect(element.getOptions().useRegex).toBe(false);

        // Click to toggle
        regexButton.click();

        expect(handler).toHaveBeenCalled();
        const event = handler.mock.calls[0][0] as CustomEvent<FilterChangeEvent>;
        expect(event.detail.options.useRegex).toBe(true);
        expect(element.getOptions().useRegex).toBe(true);
    });

    it('should toggle button visual state when clicked', () => {
        const shadowRoot = element.shadowRoot;
        const buttons = shadowRoot?.querySelectorAll('.filter-toggle');
        const caseSensitiveButton = buttons?.[0] as HTMLButtonElement;

        // Initially not active
        expect(caseSensitiveButton.classList.contains('active')).toBe(false);

        // Click to activate
        caseSensitiveButton.click();
        expect(caseSensitiveButton.classList.contains('active')).toBe(true);

        // Click to deactivate
        caseSensitiveButton.click();
        expect(caseSensitiveButton.classList.contains('active')).toBe(false);
    });

    it('should set options programmatically', () => {
        element.setOptions({
            caseSensitive: true,
            wholeWord: true,
            useRegex: false
        });

        const options = element.getOptions();
        expect(options.caseSensitive).toBe(true);
        expect(options.wholeWord).toBe(true);
        expect(options.useRegex).toBe(false);
    });

    it('should partially update options', () => {
        element.setOptions({ caseSensitive: true });
        expect(element.getOptions().caseSensitive).toBe(true);
        expect(element.getOptions().wholeWord).toBe(false);
        
        element.setOptions({ wholeWord: true });
        expect(element.getOptions().caseSensitive).toBe(true);
        expect(element.getOptions().wholeWord).toBe(true);
    });

    it('should clear the input', () => {
        element.query = 'test';
        expect(element.query).toBe('test');
        
        element.clear();
        expect(element.query).toBe('');
    });

    it('should focus the input', () => {
        const shadowRoot = element.shadowRoot;
        const input = shadowRoot?.querySelector('.filter-input') as HTMLInputElement;
        
        // Mock focus
        const focusSpy = vi.spyOn(input, 'focus');
        element.focus();
        
        expect(focusSpy).toHaveBeenCalled();
    });

    it('should have all options disabled by default', () => {
        const options = element.getOptions();
        expect(options.caseSensitive).toBe(false);
        expect(options.wholeWord).toBe(false);
        expect(options.useRegex).toBe(false);
    });

    it('should handle multiple option toggles independently', () => {
        const shadowRoot = element.shadowRoot;
        const buttons = shadowRoot?.querySelectorAll('.filter-toggle');
        const caseSensitiveButton = buttons?.[0] as HTMLButtonElement;
        const wholeWordButton = buttons?.[1] as HTMLButtonElement;
        const regexButton = buttons?.[2] as HTMLButtonElement;

        // Toggle all on
        caseSensitiveButton.click();
        wholeWordButton.click();
        regexButton.click();

        let options = element.getOptions();
        expect(options.caseSensitive).toBe(true);
        expect(options.wholeWord).toBe(true);
        expect(options.useRegex).toBe(true);

        // Toggle one off
        wholeWordButton.click();

        options = element.getOptions();
        expect(options.caseSensitive).toBe(true);
        expect(options.wholeWord).toBe(false);
        expect(options.useRegex).toBe(true);
    });

    it('should bubble filter-change events', () => {
        const handler = vi.fn();
        document.body.addEventListener('filter-change', handler);

        element.query = 'test';

        expect(handler).toHaveBeenCalled();
        
        document.body.removeEventListener('filter-change', handler);
    });
});
