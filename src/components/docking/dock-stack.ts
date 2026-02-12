import { DockStack, DockPane } from "./types.js";
import { DockManager } from "./dock-manager.js";

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
    }

    private render() {
        if (!this._node || !this._manager) return;

        const activeId = this._node.activeId || (this._node.children.length > 0 ? this._node.children[0].id : null);

        this.shadowRoot!.innerHTML = `
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    height: 100%;
                    background: var(--dock-bg-color);
                    border: 1px solid var(--dock-border-color);
                    box-sizing: border-box;
                    min-width: 0;
                    min-height: 0;
                }
                .tabs-header {
                    display: flex;
                    background: var(--dock-tab-bg);
                    overflow-x: auto;
                    overflow-y: hidden;
                    flex: 0 0 30px;
                    scrollbar-width: none;
                }
                .tabs-header::-webkit-scrollbar {
                    display: none;
                }
                .tab {
                    padding: 0 12px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    white-space: nowrap;
                    font-size: 13px;
                    color: var(--dock-tab-text);
                    background: var(--dock-tab-bg);
                    border-right: 1px solid var(--dock-border-color);
                    user-select: none;
                    position: relative;
                }
                .tab.active {
                    background: var(--dock-tab-active-bg);
                    color: var(--dock-tab-active-text);
                }
                .tab:hover:not(.active) {
                    background: rgba(255, 255, 255, 0.05);
                }
                .content-area {
                    flex: 1;
                    position: relative;
                    overflow: hidden;
                }
                .pane-content {
                    width: 100%;
                    height: 100%;
                    display: none;
                }
                .pane-content.active {
                    display: block;
                }
                .close-btn {
                    margin-left: 8px;
                    opacity: 0.5;
                    font-size: 14px;
                }
                .close-btn:hover {
                    opacity: 1;
                }
            </style>
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
    }

    private closePane(id: string) {
        // Logic to notify manager or handle removal
        // For now just a placeholder
        console.log('Close pane', id);
    }
}

customElements.define('dock-stack', DockStackComponent);
