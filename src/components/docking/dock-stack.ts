import { DockStack, DockPane } from "./types.js";
import { DockManager } from "./dock-manager.js";
import { css } from "../../utils/css-utils.js";
import dockStackCss from "./dock-stack.css?inline";

export class DockStackComponent extends HTMLElement {
    private _node: DockStack | null = null;
    private _manager: DockManager | null = null;
    private _dragOverHandler: ((e: DragEvent) => void) | null = null;
    private _dragLeaveHandler: (() => void) | null = null;
    private _dropHandler: ((e: DragEvent) => void) | null = null;

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
        
        // Set up drag and drop handlers once
        this._dragOverHandler = (e: DragEvent) => {
            if (this._manager && this._node) {
                this._manager.handleDragOver(e, this._node, this);
            }
        };
        
        this._dragLeaveHandler = () => {
            if (this._manager) {
                this._manager.handleDragLeave();
            }
        };
        
        this._dropHandler = (e: DragEvent) => {
            if (this._manager && this._node) {
                this._manager.handleDrop(e, this._node, this);
            }
        };
    }

    connectedCallback() {
        // Add drop zone listeners once when component is connected
        this.addEventListener('dragover', this._dragOverHandler!);
        this.addEventListener('dragleave', this._dragLeaveHandler!);
        this.addEventListener('drop', this._dropHandler!);
    }

    disconnectedCallback() {
        // Clean up listeners when component is disconnected
        if (this._dragOverHandler) {
            this.removeEventListener('dragover', this._dragOverHandler);
        }
        if (this._dragLeaveHandler) {
            this.removeEventListener('dragleave', this._dragLeaveHandler);
        }
        if (this._dropHandler) {
            this.removeEventListener('drop', this._dropHandler);
        }
    }

    private render() {
        if (!this._node || !this._manager) return;

        const activeId = this._node.activeId || (this._node.children.length > 0 ? this._node.children[0].id : null);

        // Show placeholder when no children exist
        if (this._node.children.length === 0) {
            this.shadowRoot!.innerHTML = `
                <div class="empty-placeholder">
                    <div class="empty-placeholder-content">
                        <h2>No Open Editors</h2>
                        <p><button id="open-file-btn" class="open-file-link">open a file</button> to get started</p>
                    </div>
                </div>
            `;
            
            // Add event listener for the open file button
            const openFileBtn = this.shadowRoot!.querySelector('#open-file-btn');
            if (openFileBtn) {
                openFileBtn.addEventListener('click', () => {
                    // Dispatch an event that the parent can listen to
                    this.dispatchEvent(new CustomEvent('file-open-request', {
                        bubbles: true,
                        composed: true
                    }));
                });
            }
            
            return;
        }

        this.shadowRoot!.innerHTML = `
            <div class="tabs-header" draggable="true" title="Drag to move entire dock">
                ${this._node.children.map(pane => `
                    <div class="tab ${pane.id === activeId ? 'active' : ''}" data-id="${pane.id}" draggable="true">
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

        // Handle dock drag from header (empty space)
        header.addEventListener('dragstart', (e) => {
            // Only initiate dock drag if not dragging from a tab
            const target = e.target as HTMLElement;
            if (!target.closest('.tab')) {
                if (this._manager && this._node) {
                    this._manager.handleStackDragStart(this._node);
                    if (e.dataTransfer) {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', this._node.id);
                    }
                    header.classList.add('dragging');
                }
            } else {
                // Prevent header drag when dragging from a tab (tab will handle its own drag)
                e.preventDefault();
            }
        });

        header.addEventListener('dragend', () => {
            header.classList.remove('dragging');
        });

        // Add drag and drop listeners for tabs
        const tabs = this.shadowRoot!.querySelectorAll('.tab');
        tabs.forEach(tab => {
            const tabElement = tab as HTMLElement;
            
            tabElement.addEventListener('dragstart', (e) => {
                const id = tabElement.dataset.id!;
                const pane = this._node!.children.find(p => p.id === id);
                if (pane && this._manager) {
                    this._manager.handleDragStart(pane, this._node!);
                    // Set drag data for browser compatibility
                    if (e.dataTransfer) {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', id);
                    }
                    tabElement.classList.add('dragging');
                }
            });

            tabElement.addEventListener('dragend', () => {
                tabElement.classList.remove('dragging');
                // Remove any drag-over indicators
                tabs.forEach(t => (t as HTMLElement).classList.remove('drag-over-left', 'drag-over-right'));
            });

            // Handle dragover for tab reordering within same stack
            tabElement.addEventListener('dragover', (e) => {
                e.preventDefault();
                
                if (!this._manager) return;
                const draggedPane = this._manager.getDraggedPane();
                if (!draggedPane) return;

                // Check if we're dragging within the same stack
                if (draggedPane.sourceStack.id === this._node!.id) {
                    // Only stop propagation when handling same-stack reordering
                    e.stopPropagation();
                    
                    const rect = tabElement.getBoundingClientRect();
                    const midpoint = rect.left + rect.width / 2;
                    const isLeftSide = e.clientX < midpoint;

                    // Remove previous indicators
                    tabs.forEach(t => (t as HTMLElement).classList.remove('drag-over-left', 'drag-over-right'));
                    
                    // Add indicator
                    if (isLeftSide) {
                        tabElement.classList.add('drag-over-left');
                    } else {
                        tabElement.classList.add('drag-over-right');
                    }
                }
            });

            tabElement.addEventListener('dragleave', () => {
                tabElement.classList.remove('drag-over-left', 'drag-over-right');
            });

            // Handle drop for tab reordering
            tabElement.addEventListener('drop', (e) => {
                e.preventDefault();
                
                if (!this._manager) return;
                const draggedPane = this._manager.getDraggedPane();
                if (!draggedPane) return;

                // Check if we're dragging within the same stack
                if (draggedPane.sourceStack.id === this._node!.id) {
                    // Only stop propagation when handling same-stack reordering
                    e.stopPropagation();
                    
                    const targetId = tabElement.dataset.id!;
                    const targetIndex = this._node!.children.findIndex(p => p.id === targetId);
                    
                    if (targetIndex !== -1) {
                        const rect = tabElement.getBoundingClientRect();
                        const midpoint = rect.left + rect.width / 2;
                        const isLeftSide = e.clientX < midpoint;
                        
                        // Calculate insert index based on which side of the tab we're on
                        const insertIndex = isLeftSide ? targetIndex : targetIndex + 1;
                        this._manager.handleTabReorder(draggedPane.pane, this._node!, insertIndex);
                    }

                    // Remove indicators
                    tabs.forEach(t => (t as HTMLElement).classList.remove('drag-over-left', 'drag-over-right'));
                }
            });
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
