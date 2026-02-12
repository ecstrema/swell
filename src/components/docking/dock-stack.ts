import { DockStack, DockPane } from "./types.js";
import { DockManager } from "./dock-manager.js";
import { css } from "../../utils/css-utils.js";
import dockStackCss from "./dock-stack.css?inline";

export class DockStackComponent extends HTMLElement {
    private _node: DockStack | null = null;
    private _manager: DockManager | null = null;

    set node(value: DockStack) {
        this._node = value;
        this.render();
    }

    set manager(value: DockManager) {
        this._manager = value;
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.adoptedStyleSheets = [css(dockStackCss)];
    }

    private render() {
        if (!this._node || !this._manager) return;

        const activeId = this._node.activeId || (this._node.children.length > 0 ? this._node.children[0].id : null);

        this.shadowRoot!.innerHTML = `
            <div class="tabs-header">
                ${this._node.children.map(pane => `
                    <div class="tab ${pane.id === activeId ? 'active' : ''}" data-id="${pane.id}">
                        ${pane.title}
                        ${pane.closable !== false ? '<span class="close-btn">×</span>' : ''}
                    </div>
                `).join('')}
            </div>
            <div class="content-area"></div>
        `;

        const header = this.shadowRoot!.querySelector('.tabs-header')!;
        header.addEventListener('click', (e) => {
            const tab = (e.target as HTMLElement).closest('.tab') as HTMLElement;
            if (tab) {
                const id = tab.dataset.id!;
                if ((e.target as HTMLElement).classList.contains('close-btn')) {
                    this.closePane(id);
                } else {
                    this.setActivePane(id);
                }
            }
        });

        const contentArea = this.shadowRoot!.querySelector('.content-area')!;
        this._node.children.forEach(pane => {
            const paneWrapper = document.createElement('div');
            paneWrapper.className = `pane-content ${pane.id === activeId ? 'active' : ''}`;
            paneWrapper.dataset.id = pane.id;

            const content = this._manager!.getContent(pane.contentId, pane.id);
            paneWrapper.appendChild(content);
            contentArea.appendChild(paneWrapper);
        });
    }

    private setActivePane(id: string) {
        if (!this._node) return;
        this._node.activeId = id;
        this.render();
        
        // Emit event to notify parent that active pane changed
        this.dispatchEvent(new CustomEvent('pane-select', {
            detail: { id },
            bubbles: true,
            composed: true
        }));
    }

    private closePane(id: string) {
        // Emit event to notify parent that a pane should be closed
        this.dispatchEvent(new CustomEvent('pane-close', {
            detail: { id },
            bubbles: true,
            composed: true
        }));
    }
}

customElements.define('dock-stack', DockStackComponent);
