import { DockBox, DockNode } from "./types.js";
import type { DockManager } from "./dock-manager.js";
import { css } from "../../utils/css-utils.js";
import dockBoxCss from "./dock-box.css?inline";

export class DockBoxComponent extends HTMLElement {
    private _node: DockBox | null = null;
    private _manager: DockManager | null = null;

    set node(value: DockBox) {
        this._node = value;
        this.render();
    }

    set manager(value: DockManager) {
        this._manager = value;
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.adoptedStyleSheets = [css(dockBoxCss)];
    }

    private render() {
        if (!this._node || !this._manager) return;

        const direction = this._node.direction === 'row' ? 'row' : 'column';
        this.style.setProperty('--direction', direction);

        this.shadowRoot!.innerHTML = `
            <div id="container" style="display: contents;"></div>
        `;

        const container = this.shadowRoot!.querySelector('#container')!;

        this._node.children.forEach((child, index) => {
            if (index > 0) {
                const resizer = document.createElement('div');
                resizer.className = `resizer ${direction}`;
                resizer.dataset.index = index.toString();
                container.appendChild(resizer);

                resizer.addEventListener('mousedown', (e) => this.onResizeStart(e, index - 1, index));
            }
            this._manager!.renderNode(child, container);
        });
    }

    private onResizeStart(e: MouseEvent, prevIndex: number, nextIndex: number) {
        if (!this._node) return;

        e.preventDefault();
        const direction = this._node.direction;
        const startPos = direction === 'row' ? e.clientX : e.clientY;

        const prevChild = this._node.children[prevIndex];
        const nextChild = this._node.children[nextIndex];
        const totalWeight = prevChild.weight + nextChild.weight;
        const initialPrevWeight = prevChild.weight;
        const initialNextWeight = nextChild.weight;

        const container = this.shadowRoot!.querySelector('#container')!;
        const children = Array.from(container.children).filter(c => c.tagName.toLowerCase().startsWith('dock-'));
        const prevEl = children[prevIndex] as HTMLElement;
        const nextEl = children[nextIndex] as HTMLElement;

        const prevRect = prevEl.getBoundingClientRect();
        const nextRect = nextEl.getBoundingClientRect();
        const totalSize = direction === 'row' ?
            prevRect.width + nextRect.width :
            prevRect.height + nextRect.height;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const currentPos = direction === 'row' ? moveEvent.clientX : moveEvent.clientY;
            const delta = currentPos - startPos;

            let deltaWeight = (delta / totalSize) * totalWeight;

            // Constrain
            const newPrevWeight = Math.max(0.1, initialPrevWeight + deltaWeight);
            const newNextWeight = Math.max(0.1, initialNextWeight - (newPrevWeight - initialPrevWeight));

            prevChild.weight = newPrevWeight;
            nextChild.weight = newNextWeight;

            prevEl.style.flex = `${prevChild.weight}`;
            nextEl.style.flex = `${nextChild.weight}`;
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
        };

        document.body.style.cursor = direction === 'row' ? 'ew-resize' : 'ns-resize';
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }
}

customElements.define('dock-box', DockBoxComponent);
