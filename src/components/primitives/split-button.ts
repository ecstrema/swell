import { css } from "../../utils/css-utils.js";
import splitButtonCss from "./split-button.css?inline";

/**
 * A split button component that displays two adjacent buttons.
 * 
 * Usage:
 * ```html
 * <app-split-button 
 *   left-label="+ Add Timeline" 
 *   right-label="+ Add Minimap">
 * </app-split-button>
 * ```
 * 
 * Events:
 * - left-click: Fired when left button is clicked
 * - right-click: Fired when right button is clicked
 * 
 * @fires left-click - When left button is clicked
 * @fires right-click - When right button is clicked
 */
export class SplitButton extends HTMLElement {
    private leftButton: HTMLButtonElement | null = null;
    private rightButton: HTMLButtonElement | null = null;

    static get observedAttributes() {
        return ['left-label', 'right-label'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.adoptedStyleSheets = [css(splitButtonCss)];
    }

    connectedCallback() {
        this.render();
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue !== newValue) {
            this.render();
        }
    }

    /**
     * Label for the left button
     */
    get leftLabel(): string {
        return this.getAttribute('left-label') || 'Left';
    }

    set leftLabel(value: string) {
        this.setAttribute('left-label', value);
    }

    /**
     * Label for the right button
     */
    get rightLabel(): string {
        return this.getAttribute('right-label') || 'Right';
    }

    set rightLabel(value: string) {
        this.setAttribute('right-label', value);
    }

    private render() {
        this.shadowRoot!.innerHTML = `
            <div class="split-button-container">
                <button class="split-button-left">${this.leftLabel}</button>
                <button class="split-button-right">${this.rightLabel}</button>
            </div>
        `;

        this.leftButton = this.shadowRoot!.querySelector('.split-button-left');
        this.rightButton = this.shadowRoot!.querySelector('.split-button-right');

        if (this.leftButton) {
            this.leftButton.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('left-click', {
                    bubbles: true,
                    composed: true
                }));
            });
        }

        if (this.rightButton) {
            this.rightButton.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('right-click', {
                    bubbles: true,
                    composed: true
                }));
            });
        }
    }
}

if (!customElements.get('app-split-button')) {
    customElements.define('app-split-button', SplitButton);
}
