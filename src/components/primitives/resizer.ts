import { css } from "../../utils/css-utils.js";
import resizerCss from "./resizer.css?inline";

/**
 * A generic resizer component that can be placed between elements to allow resizing.
 * 
 * Usage:
 * ```html
 * <div class="container">
 *   <div class="panel-1">Content 1</div>
 *   <app-resizer direction="horizontal"></app-resizer>
 *   <div class="panel-2">Content 2</div>
 * </div>
 * ```
 * 
 * Events:
 * - resize-start: Fired when resize starts (detail: { startPos: number })
 * - resize-move: Fired during resize (detail: { delta: number, currentPos: number })
 * - resize-end: Fired when resize ends (detail: { totalDelta: number })
 * 
 * @fires resize-start - When resize operation starts
 * @fires resize-move - During resize operation
 * @fires resize-end - When resize operation ends
 */
export class Resizer extends HTMLElement {
    private startPos: number = 0;
    private onMouseMoveBound: (e: MouseEvent) => void;
    private onMouseUpBound: () => void;

    static get observedAttributes() {
        return ['direction'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.adoptedStyleSheets = [css(resizerCss)];
        
        this.onMouseMoveBound = this.onMouseMove.bind(this);
        this.onMouseUpBound = this.onMouseUp.bind(this);
        
        this.addEventListener('mousedown', this.onMouseDown.bind(this));
    }

    /**
     * Direction of the resizer: 'horizontal' for left-right resize, 'vertical' for top-bottom resize
     */
    get direction(): 'horizontal' | 'vertical' {
        return this.getAttribute('direction') as 'horizontal' | 'vertical' || 'horizontal';
    }

    set direction(value: 'horizontal' | 'vertical') {
        this.setAttribute('direction', value);
    }

    private onMouseDown(e: MouseEvent) {
        e.preventDefault();
        this.startPos = this.direction === 'horizontal' ? e.clientX : e.clientY;
        
        // Set cursor on body to ensure it persists during drag
        document.body.style.cursor = this.direction === 'horizontal' ? 'ew-resize' : 'ns-resize';
        document.body.style.userSelect = 'none';
        
        // Emit resize-start event
        this.dispatchEvent(new CustomEvent('resize-start', {
            detail: { startPos: this.startPos },
            bubbles: true,
            composed: true
        }));
        
        window.addEventListener('mousemove', this.onMouseMoveBound);
        window.addEventListener('mouseup', this.onMouseUpBound);
    }

    private onMouseMove(e: MouseEvent) {
        const currentPos = this.direction === 'horizontal' ? e.clientX : e.clientY;
        const delta = currentPos - this.startPos;
        
        // Emit resize-move event with delta
        this.dispatchEvent(new CustomEvent('resize-move', {
            detail: { delta, currentPos },
            bubbles: true,
            composed: true
        }));
    }

    private onMouseUp(e: MouseEvent) {
        const currentPos = this.direction === 'horizontal' ? 
            e.clientX : 
            e.clientY;
        const totalDelta = currentPos - this.startPos;
        
        // Clean up
        window.removeEventListener('mousemove', this.onMouseMoveBound);
        window.removeEventListener('mouseup', this.onMouseUpBound);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        // Emit resize-end event
        this.dispatchEvent(new CustomEvent('resize-end', {
            detail: { totalDelta },
            bubbles: true,
            composed: true
        }));
    }
}

if (!customElements.get('app-resizer')) {
    customElements.define('app-resizer', Resizer);
}
