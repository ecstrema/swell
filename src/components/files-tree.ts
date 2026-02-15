import { TreeView, TreeNode } from "./tree-view.js";
import { css } from "../utils/css-utils.js";
import filesTreeCss from "./files-tree.css?inline";
import "./tree-view.js";

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

/**
 * FilesTree component displays the hierarchical structure of signals from loaded waveform files.
 * It extends TreeView to provide file-specific functionality for signal selection.
 */
export class FilesTree extends TreeView {
    private _hierarchyData: HierarchyRoot | null = null;
    private _filename: string | null = null;
    private _selectedSignalRefs: Set<number> = new Set();

    constructor() {
        super();
        
        // Add FilesTree-specific styling
        if (this.shadowRoot) {
            const existingSheets = Array.from(this.shadowRoot.adoptedStyleSheets);
            this.shadowRoot.adoptedStyleSheets = [...existingSheets, css(filesTreeCss)];
        }
        
        // Configure the tree view for file hierarchy display
        this.updateConfig();
    }

    private updateConfig() {
        this.config = {
            onLeafClick: (node: TreeNode) => {
                this.dispatchEvent(new CustomEvent('signal-select', {
                    detail: { name: node.name, ref: node.id, filename: this._filename },
                    bubbles: true,
                    composed: true
                }));
            },
            onCheckboxChange: (node: TreeNode, checked: boolean) => {
                this.dispatchEvent(new CustomEvent('checkbox-toggle', {
                    detail: { name: node.name, ref: node.id, filename: this._filename, checked },
                    bubbles: true,
                    composed: true
                }));
            },
            leafNodeClass: 'var-node',
            scopeNodeClass: 'tree-node',
            showCheckboxes: true,
            isChecked: (node: TreeNode) => {
                return this._selectedSignalRefs.has(node.id as number);
            }
        };
    }

    set hierarchyData(data: HierarchyRoot | null) {
        this._hierarchyData = data;
        this.updateTreeData();
    }

    get hierarchyData() {
        return this._hierarchyData;
    }

    // Keep backward compatibility with the old 'data' property
    set data(data: HierarchyRoot | null) {
        this.hierarchyData = data;
    }

    get data() {
        return this.hierarchyData;
    }

    set filename(filename: string | null) {
        this._filename = filename;
        // Note: Filename should be set before data to ensure signal-select events
        // use the correct filename. Data setter triggers render() automatically.
    }

    get filename() {
        return this._filename;
    }

    set selectedSignalRefs(refs: number[]) {
        this._selectedSignalRefs = new Set(refs);
        // Re-render the tree to show updated checkboxes
        // Note: This will update the config via the isChecked callback
        this.updateTreeData();
    }

    get selectedSignalRefs() {
        return Array.from(this._selectedSignalRefs);
    }

    private updateTreeData() {
        if (!this._hierarchyData) {
            super.data = [];
            return;
        }

        // Convert hierarchy data to tree nodes
        const treeNodes: TreeNode[] = [];

        if (this._hierarchyData.scopes) {
            this._hierarchyData.scopes.forEach(s => {
                treeNodes.push(this.convertScopeToNode(s));
            });
        }
        if (this._hierarchyData.vars) {
            this._hierarchyData.vars.forEach(v => {
                treeNodes.push(this.convertVarToNode(v));
            });
        }

        super.data = treeNodes;
    }

    private convertScopeToNode(scope: HierarchyScope): TreeNode {
        const children: TreeNode[] = [];

        if (scope.scopes) {
            scope.scopes.forEach(s => {
                children.push(this.convertScopeToNode(s));
            });
        }
        if (scope.vars) {
            scope.vars.forEach(v => {
                children.push(this.convertVarToNode(v));
            });
        }

        return {
            name: scope.name,
            id: scope.ref,
            children
        };
    }

    private convertVarToNode(variable: HierarchyVar): TreeNode {
        return {
            name: variable.name,
            id: variable.ref
        };
    }
}

if (!customElements.get('files-tree')) {
    customElements.define('files-tree', FilesTree);
}
