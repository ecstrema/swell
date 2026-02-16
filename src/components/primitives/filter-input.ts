import { css } from "../../utils/css-utils.js";
import filterInputCss from "./filter-input.css?inline";
import FormatLetterCaseIcon from '~icons/mdi/format-letter-case?raw';
import FormatTextVariantIcon from '~icons/mdi/format-text-variant?raw';
import RegexIcon from '~icons/mdi/regex?raw';

export interface FilterOptions {
    caseSensitive: boolean;
    wholeWord: boolean;
    useRegex: boolean;
}

export interface FilterChangeEvent {
    query: string;
    options: FilterOptions;
}

/**
 * FilterInput component provides a text input with toggleable filter options.
 * Features:
 * - Text input for filtering
 * - Case sensitivity toggle
 * - Whole word matching toggle
 * - Regular expression matching toggle
 * 
 * Emits 'filter-change' events when the filter text or options change.
 */
export class FilterInput extends HTMLElement {
    private input: HTMLInputElement;
    private caseSensitiveButton: HTMLButtonElement;
    private wholeWordButton: HTMLButtonElement;
    private regexButton: HTMLButtonElement;
    
    private options: FilterOptions = {
        caseSensitive: false,
        wholeWord: false,
        useRegex: false
    };
    
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Apply styles
        this.shadowRoot!.adoptedStyleSheets = [css(filterInputCss)];
        
        // Create the HTML structure
        this.shadowRoot!.innerHTML = `
            <div class="filter-container">
                <input type="text" class="filter-input" placeholder="Filter..." />
                <div class="filter-options">
                    <button class="filter-toggle" title="Match case (Aa)" aria-label="Match case">
                        ${FormatLetterCaseIcon}
                    </button>
                    <button class="filter-toggle" title="Match whole word" aria-label="Match whole word">
                        ${FormatTextVariantIcon}
                    </button>
                    <button class="filter-toggle" title="Use regular expression" aria-label="Use regular expression">
                        ${RegexIcon}
                    </button>
                </div>
            </div>
        `;
        
        // Get references to elements
        this.input = this.shadowRoot!.querySelector('.filter-input') as HTMLInputElement;
        const buttons = this.shadowRoot!.querySelectorAll('.filter-toggle');
        this.caseSensitiveButton = buttons[0] as HTMLButtonElement;
        this.wholeWordButton = buttons[1] as HTMLButtonElement;
        this.regexButton = buttons[2] as HTMLButtonElement;
        
        // Set up event listeners
        this.input.addEventListener('input', () => this.emitChange());
        
        this.caseSensitiveButton.addEventListener('click', () => {
            this.options.caseSensitive = !this.options.caseSensitive;
            this.updateButtonStates();
            this.emitChange();
        });
        
        this.wholeWordButton.addEventListener('click', () => {
            this.options.wholeWord = !this.options.wholeWord;
            this.updateButtonStates();
            this.emitChange();
        });
        
        this.regexButton.addEventListener('click', () => {
            this.options.useRegex = !this.options.useRegex;
            this.updateButtonStates();
            this.emitChange();
        });
        
        // Initialize button states
        this.updateButtonStates();
    }
    
    /**
     * Get the current filter query
     */
    get query(): string {
        return this.input.value;
    }
    
    /**
     * Set the filter query
     */
    set query(value: string) {
        this.input.value = value;
        this.emitChange();
    }
    
    /**
     * Get the current filter options
     */
    getOptions(): FilterOptions {
        return { ...this.options };
    }
    
    /**
     * Set the filter options
     */
    setOptions(options: Partial<FilterOptions>) {
        this.options = {
            ...this.options,
            ...options
        };
        this.updateButtonStates();
        this.emitChange();
    }
    
    /**
     * Clear the filter input
     */
    clear() {
        this.input.value = '';
        this.emitChange();
    }
    
    /**
     * Focus the filter input
     */
    focus() {
        this.input.focus();
    }
    
    /**
     * Update the visual state of toggle buttons
     */
    private updateButtonStates() {
        this.caseSensitiveButton.classList.toggle('active', this.options.caseSensitive);
        this.wholeWordButton.classList.toggle('active', this.options.wholeWord);
        this.regexButton.classList.toggle('active', this.options.useRegex);
    }
    
    /**
     * Emit a filter-change event with current state
     */
    private emitChange() {
        const detail: FilterChangeEvent = {
            query: this.input.value,
            options: this.getOptions()
        };
        
        this.dispatchEvent(new CustomEvent<FilterChangeEvent>('filter-change', {
            detail,
            bubbles: true,
            composed: true
        }));
    }
}

if (!customElements.get('filter-input')) {
    customElements.define('filter-input', FilterInput);
}
