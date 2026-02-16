import { css } from "../utils/css-utils.js";
import shortcutDisplayCss from "./shortcut-display.css?inline";

/**
 * ShortcutDisplay - A component that displays a keyboard shortcut
 * Used to show shortcuts in a consistent, styled format throughout the app
 */
export class ShortcutDisplay extends HTMLElement {
    private shortcut: string = '';

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.adoptedStyleSheets = [css(shortcutDisplayCss)];
    }

    connectedCallback() {
        this.render();
    }

    /**
     * Set the shortcut to display
     */
    setShortcut(shortcut: string) {
        this.shortcut = shortcut;
        this.render();
    }

    /**
     * Get the current shortcut
     */
    getShortcut(): string {
        return this.shortcut;
    }

    private render() {
        if (!this.shadowRoot) return;

        if (!this.shortcut) {
            this.shadowRoot.innerHTML = '';
            return;
        }

        this.shadowRoot.innerHTML = `
            <div class="shortcut">${this.escapeHtml(this.shortcut)}</div>
        `;
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Static attributes to observe
     */
    static get observedAttributes() {
        return ['shortcut'];
    }

    /**
     * Handle attribute changes
     */
    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'shortcut' && oldValue !== newValue) {
            this.shortcut = newValue || '';
            this.render();
        }
    }
}

if (!customElements.get('app-shortcut-display')) {
    customElements.define('app-shortcut-display', ShortcutDisplay);
}
