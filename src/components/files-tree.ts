export interface HierarchyVar {
    name: string;
    ref: number;
}

export interface HierarchyScope {
    name: string;
    ref: number;
    vars: HierarchyVar[];
    scopes: HierarchyScope[];
}

export interface HierarchyRoot {
    name: string;
    ref: number;
    vars: HierarchyVar[];
    scopes: HierarchyScope[];
}

export class FilesTree extends HTMLElement {
    private _data: HierarchyRoot | null = null;
    private container: HTMLDivElement;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.shadowRoot!.innerHTML = `
        <style>
            :host {
                display: block;
                height: 100%;
                overflow-y: auto;
                background-color: var(--color-bg-surface);
                border-right: 1px solid var(--color-border);
                font-family: monospace; /* Often better for hierarchy */
                font-size: 14px;
                color: var(--color-text);
            }
            .tree-node {
                margin-left: 10px;
            }
            details > summary {
                cursor: pointer;
                list-style: none; /* Hide default triangle in some browsers */
                padding: 2px 4px;
                user-select: none;
            }
            details > summary::-webkit-details-marker {
                display: none;
            }
            details > summary:hover {
                background-color: var(--color-bg-hover);
            }
            details > summary::before {
                content: '▶';
                display: inline-block;
                margin-right: 6px;
                font-size: 0.8em;
                transition: transform 0.2s;
            }
            details[open] > summary::before {
                transform: rotate(90deg);
            }
            .var-node {
                margin-left: 20px;
                padding: 2px 4px;
                cursor: default; /* Selectable? Drag/Drop? */
                color: var(--color-text-muted);
            }
            .var-node:hover {
                background-color: var(--color-bg-hover);
                color: var(--color-text);
            }
            .empty-msg {
                padding: 20px;
                text-align: center;
                color: var(--color-text-muted);
                font-family: var(--font-family, sans-serif);
                font-style: italic;
            }
        </style>
        <div id="tree-container"></div>
        `;

        this.container = this.shadowRoot!.querySelector('#tree-container') as HTMLDivElement;
    }

    set data(data: HierarchyRoot | null) {
        this._data = data;
        this.render();
    }

    get data() {
        return this._data;
    }

    render() {
        this.container.innerHTML = '';

        if (!this._data) {
            this.container.innerHTML = '<div class="empty-msg">No loaded hierarchy</div>';
            return;
        }

        const rootEl = this.createScopeElement(this._data);
        // If the root is artificial ("root"), maybe we skip displaying it and only display children?
        // But for generic purposes, let's just dump it.
        // Actually, often the top level list is just children.
        // Let's iterate over the root scopes/vars directly.

        if (this._data.scopes) {
            this._data.scopes.forEach(s => {
                this.container.appendChild(this.createScopeElement(s));
            });
        }
        if (this._data.vars) {
            this._data.vars.forEach(v => {
                this.container.appendChild(this.createVarElement(v));
            });
        }
    }

    createScopeElement(scope: HierarchyScope | HierarchyRoot): HTMLElement {
        const details = document.createElement('details');
        details.className = 'tree-node';
        details.open = true; // Auto open top levels? Maybe

        const summary = document.createElement('summary');
        summary.textContent = scope.name;
        details.appendChild(summary);

        // Recursively add children
        if (scope.scopes) {
            scope.scopes.forEach(s => {
                details.appendChild(this.createScopeElement(s));
            });
        }
        if (scope.vars) {
            scope.vars.forEach(v => {
                details.appendChild(this.createVarElement(v));
            });
        }

        return details;
    }

    createVarElement(variable: HierarchyVar): HTMLElement {
        const div = document.createElement('div');
        div.className = 'var-node';
        div.textContent = variable.name;
        // Maybe store ref for logic?
        div.dataset.ref = variable.ref.toString();
        // Add click listener for future logic (adding to wave view)
        return div;
    }
}

if (!customElements.get('files-tree')) {
    customElements.define('files-tree', FilesTree);
}
