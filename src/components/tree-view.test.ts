import { describe, it, expect, beforeEach } from 'vitest';
import './tree-view.js';
import { TreeView, TreeNode } from './tree-view.js';

describe('TreeView Component', () => {
  let element: TreeView;

  beforeEach(() => {
    element = document.createElement('tree-view') as TreeView;
    document.body.appendChild(element);
  });

  it('should render without errors', () => {
    expect(element).toBeTruthy();
    expect(element.shadowRoot).toBeTruthy();
  });

  it('should display empty message when no data', () => {
    element.data = [];
    const shadowRoot = element.shadowRoot;
    expect(shadowRoot?.textContent).toContain('No items');
  });

  it('should render flat list of nodes', () => {
    const nodes: TreeNode[] = [
      { name: 'Node 1', id: 1 },
      { name: 'Node 2', id: 2 },
      { name: 'Node 3', id: 3 }
    ];
    
    element.data = nodes;
    
    const shadowRoot = element.shadowRoot;
    expect(shadowRoot?.textContent).toContain('Node 1');
    expect(shadowRoot?.textContent).toContain('Node 2');
    expect(shadowRoot?.textContent).toContain('Node 3');
  });

  it('should render hierarchical nodes', () => {
    const nodes: TreeNode[] = [
      {
        name: 'Parent 1',
        id: 1,
        children: [
          { name: 'Child 1', id: 2 },
          { name: 'Child 2', id: 3 }
        ]
      }
    ];
    
    element.data = nodes;
    
    const shadowRoot = element.shadowRoot;
    expect(shadowRoot?.textContent).toContain('Parent 1');
    expect(shadowRoot?.textContent).toContain('Child 1');
    expect(shadowRoot?.textContent).toContain('Child 2');
  });

  it('should call onLeafClick callback when leaf node is clicked', () => {
    let clickedNode: TreeNode | null = null;
    
    element.config = {
      onLeafClick: (node: TreeNode) => {
        clickedNode = node;
      }
    };
    
    const nodes: TreeNode[] = [
      { name: 'Test Node', id: 42 }
    ];
    
    element.data = nodes;
    
    const shadowRoot = element.shadowRoot;
    const leafNode = shadowRoot?.querySelector('.leaf-node') as HTMLElement;
    expect(leafNode).toBeTruthy();
    
    leafNode.click();
    
    expect(clickedNode).not.toBeNull();
    expect(clickedNode?.name).toBe('Test Node');
    expect(clickedNode?.id).toBe(42);
  });

  it('should use custom CSS classes when provided', () => {
    element.config = {
      leafNodeClass: 'custom-leaf',
      scopeNodeClass: 'custom-scope'
    };
    
    const nodes: TreeNode[] = [
      {
        name: 'Parent',
        id: 1,
        children: [
          { name: 'Child', id: 2 }
        ]
      }
    ];
    
    element.data = nodes;
    
    const shadowRoot = element.shadowRoot;
    expect(shadowRoot?.querySelector('.custom-scope')).toBeTruthy();
    expect(shadowRoot?.querySelector('.custom-leaf')).toBeTruthy();
  });
});
