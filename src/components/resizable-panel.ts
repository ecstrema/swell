import { css } from "../utils/css-utils.js";
import resizablePanelCss from "./resizable-panel.css?inline";
import "./resizer.js";

/**
 * A generic resizable panel component that wraps content with a resizer.
 * The panel can be resized by dragging the resizer handle.
 * 
 * Usage:
 * ```html
 * <app-resizable-panel 
 *   direction="horizontal" 
 *   initial-size="250px" 
 *   min-size="200px" 
 *   max-size="600px">
 *   <div slot="panel">Resizable panel content</div>
 *   <div slot="content">Main content</div>
 * </app-resizable-panel>
 * ```
 * 
 * Attributes:
 * - direction: 'horizontal' (default) or 'vertical' - determines resize direction
 * - initial-size: Initial size of the panel (e.g., '250px')
 * - min-size: Minimum size of the panel (e.g., '100px')
 * - max-size: Maximum size of the panel (e.g., '600px')
 * 
 * Slots:
 * - panel: Content for the resizable panel
 * - content: Content for the remaining space
 * 
 * @fires panel-resize - When panel is resized (detail: { size: number })
 */
export class ResizablePanel extends HTMLElement {
    private panelElement: HTMLElement | null = null;
    private currentSize: number = 250;

    static get observedAttributes() {
        return ['direction', 'initial-size', 'min-size', 'max-size'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.adoptedStyleSheets = [css(resizablePanelCss)];
        this.render();
    }

    connectedCallback() {
        // Parse initial size if provided
        const initialSize = this.getAttribute('initial-size');
        if (initialSize) {
            this.currentSize = this.parseSizeValue(initialSize);
        }
        
        this.updatePanelSize();
        this.setupResizeListener();
    }

    /**
     * Direction of the panel: 'horizontal' for left-right, 'vertical' for top-bottom
     */
    get direction(): 'horizontal' | 'vertical' {
        return this.getAttribute('direction') as 'horizontal' | 'vertical' || 'horizontal';
    }

    set direction(value: 'horizontal' | 'vertical') {
        this.setAttribute('direction', value);
        this.updateDirection();
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue === newValue) return;
        
        if (name === 'direction') {
            this.updateDirection();
        } else if (name === 'initial-size' && !this.panelElement) {
            this.currentSize = this.parseSizeValue(newValue);
            this.updatePanelSize();
        }
    }

    private render() {
        this.shadowRoot!.innerHTML = `
            <div class="panel-content" id="panel-content">
                <slot name="panel"></slot>
            </div>
            <app-resizer id="resizer"></app-resizer>
            <div class="remaining-content">
                <slot name="content"></slot>
            </div>
        `;
        
        this.panelElement = this.shadowRoot!.querySelector('#panel-content') as HTMLElement;
    }

    private updateDirection() {
        const resizer = this.shadowRoot!.querySelector('#resizer');
        if (resizer) {
            resizer.setAttribute('direction', this.direction);
        }
        
        // Update CSS custom property for flex direction
        const flexDir = this.direction === 'horizontal' ? 'row' : 'column';
        this.style.setProperty('--panel-direction', flexDir);
    }

    private setupResizeListener() {
        const resizer = this.shadowRoot!.querySelector('#resizer');
        if (!resizer) return;
        
        resizer.addEventListener('resize-move', (e: Event) => {
            const customEvent = e as CustomEvent;
            const { delta } = customEvent.detail;
            
            // Calculate new size
            const initialSize = this.currentSize;
            const newSize = initialSize + delta;
            
            // Apply constraints
            const minSize = this.parseSizeValue(this.getAttribute('min-size') || '100px');
            const maxSize = this.parseSizeValue(this.getAttribute('max-size') || '99999px');
            const constrainedSize = Math.max(minSize, Math.min(maxSize, newSize));
            
            // Update the panel size
            if (this.panelElement) {
                const prop = this.direction === 'horizontal' ? 'width' : 'height';
                this.panelElement.style[prop] = `${constrainedSize}px`;
            }
        });
        
        resizer.addEventListener('resize-end', (e: Event) => {
            const customEvent = e as CustomEvent;
            const { totalDelta } = customEvent.detail;
            
            // Update stored size
            const newSize = this.currentSize + totalDelta;
            const minSize = this.parseSizeValue(this.getAttribute('min-size') || '100px');
            const maxSize = this.parseSizeValue(this.getAttribute('max-size') || '99999px');
            this.currentSize = Math.max(minSize, Math.min(maxSize, newSize));
            
            // Emit event
            this.dispatchEvent(new CustomEvent('panel-resize', {
                detail: { size: this.currentSize },
                bubbles: true,
                composed: true
            }));
        });
    }

    private updatePanelSize() {
        if (!this.panelElement) return;
        
        const prop = this.direction === 'horizontal' ? 'width' : 'height';
        this.panelElement.style[prop] = `${this.currentSize}px`;
    }

    private parseSizeValue(value: string): number {
        // Parse values like '250px', '50%', etc. For now, just handle px
        const match = value.match(/^(\d+(?:\.\d+)?)(px)?$/);
        if (match) {
            return parseFloat(match[1]);
        }
        return 250; // Default fallback
    }
}

if (!customElements.get('app-resizable-panel')) {
    customElements.define('app-resizable-panel', ResizablePanel);
}
