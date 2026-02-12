import { css } from "../utils/css-utils.js";
import { scrollbarSheet } from "../styles/shared-sheets.js";
import filesTreeCss from "./files-tree.css?inline";

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
    private _filename: string | null = null;
    private container: HTMLDivElement;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.shadowRoot!.adoptedStyleSheets = [scrollbarSheet, css(filesTreeCss)];

        this.shadowRoot!.innerHTML = `
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

    set filename(filename: string | null) {
        this._filename = filename;
        // Note: Filename should be set before data to ensure signal-select events
        // use the correct filename. Data setter triggers render() automatically.
    }

    get filename() {
        return this._filename;
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
        div.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('signal-select', {
                detail: { name: variable.name, ref: variable.ref, filename: this._filename },
                bubbles: true,
                composed: true
            }));
        });
        return div;
    }
}

if (!customElements.get('files-tree')) {
    customElements.define('files-tree', FilesTree);
}
