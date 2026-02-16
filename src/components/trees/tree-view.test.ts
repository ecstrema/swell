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

  it('should show filter input when showFilter is enabled', () => {
    element.config = {
      showFilter: true
    };
    
    const shadowRoot = element.shadowRoot;
    const filterContainer = shadowRoot?.querySelector('#filter-container') as HTMLElement;
    const filterInput = shadowRoot?.querySelector('filter-input');
    
    expect(filterContainer).toBeTruthy();
    expect(filterContainer.style.display).not.toBe('none');
    expect(filterInput).toBeTruthy();
  });

  it('should hide filter input when showFilter is disabled', () => {
    element.config = {
      showFilter: false
    };
    
    const shadowRoot = element.shadowRoot;
    const filterContainer = shadowRoot?.querySelector('#filter-container') as HTMLElement;
    
    expect(filterContainer).toBeTruthy();
    expect(filterContainer.style.display).toBe('none');
  });

  it('should filter flat list of nodes by name', () => {
    element.config = {
      showFilter: true
    };
    
    const nodes: TreeNode[] = [
      { name: 'Apple', id: 1 },
      { name: 'Banana', id: 2 },
      { name: 'Cherry', id: 3 }
    ];
    
    element.data = nodes;
    
    const shadowRoot = element.shadowRoot;
    const filterInputEl = shadowRoot?.querySelector('filter-input');
    const filterInputShadow = filterInputEl?.shadowRoot;
    const filterInput = filterInputShadow?.querySelector('.filter-input') as HTMLInputElement;
    
    // Initially all nodes should be visible
    expect(shadowRoot?.textContent).toContain('Apple');
    expect(shadowRoot?.textContent).toContain('Banana');
    expect(shadowRoot?.textContent).toContain('Cherry');
    
    // Filter for "an"
    filterInput.value = 'an';
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Only Banana should be visible
    expect(shadowRoot?.textContent).not.toContain('Apple');
    expect(shadowRoot?.textContent).toContain('Banana');
    expect(shadowRoot?.textContent).not.toContain('Cherry');
    
    // Filter for "e"
    filterInput.value = 'e';
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Apple and Cherry should be visible
    expect(shadowRoot?.textContent).toContain('Apple');
    expect(shadowRoot?.textContent).not.toContain('Banana');
    expect(shadowRoot?.textContent).toContain('Cherry');
  });

  it('should filter hierarchical nodes and show matching children', () => {
    element.config = {
      showFilter: true
    };
    
    const nodes: TreeNode[] = [
      {
        name: 'Fruits',
        id: 1,
        children: [
          { name: 'Apple', id: 2 },
          { name: 'Banana', id: 3 }
        ]
      },
      {
        name: 'Vegetables',
        id: 4,
        children: [
          { name: 'Carrot', id: 5 },
          { name: 'Broccoli', id: 6 }
        ]
      }
    ];
    
    element.data = nodes;
    
    const shadowRoot = element.shadowRoot;
    const filterInputEl = shadowRoot?.querySelector('filter-input');
    const filterInputShadow = filterInputEl?.shadowRoot;
    const filterInput = filterInputShadow?.querySelector('.filter-input') as HTMLInputElement;
    
    // Filter for "apple"
    filterInput.value = 'apple';
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Should show Fruits parent and Apple child
    expect(shadowRoot?.textContent).toContain('Fruits');
    expect(shadowRoot?.textContent).toContain('Apple');
    expect(shadowRoot?.textContent).not.toContain('Banana');
    expect(shadowRoot?.textContent).not.toContain('Vegetables');
    
    // Filter for "carr"
    filterInput.value = 'carr';
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Should show Vegetables parent and Carrot child
    expect(shadowRoot?.textContent).not.toContain('Fruits');
    expect(shadowRoot?.textContent).toContain('Vegetables');
    expect(shadowRoot?.textContent).toContain('Carrot');
    expect(shadowRoot?.textContent).not.toContain('Broccoli');
  });

  it('should show parent when parent name matches filter', () => {
    element.config = {
      showFilter: true
    };
    
    const nodes: TreeNode[] = [
      {
        name: 'Category A',
        id: 1,
        children: [
          { name: 'Item 1', id: 2 },
          { name: 'Item 2', id: 3 }
        ]
      }
    ];
    
    element.data = nodes;
    
    const shadowRoot = element.shadowRoot;
    const filterInputEl = shadowRoot?.querySelector('filter-input');
    const filterInputShadow = filterInputEl?.shadowRoot;
    const filterInput = filterInputShadow?.querySelector('.filter-input') as HTMLInputElement;
    
    // Filter for "category"
    filterInput.value = 'category';
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Should show parent and all children
    expect(shadowRoot?.textContent).toContain('Category A');
    expect(shadowRoot?.textContent).toContain('Item 1');
    expect(shadowRoot?.textContent).toContain('Item 2');
  });

  it('should show "No matching items" when filter has no results', () => {
    element.config = {
      showFilter: true
    };
    
    const nodes: TreeNode[] = [
      { name: 'Apple', id: 1 },
      { name: 'Banana', id: 2 }
    ];
    
    element.data = nodes;
    
    const shadowRoot = element.shadowRoot;
    const filterInputEl = shadowRoot?.querySelector('filter-input');
    const filterInputShadow = filterInputEl?.shadowRoot;
    const filterInput = filterInputShadow?.querySelector('.filter-input') as HTMLInputElement;
    
    // Filter for something that doesn't exist
    filterInput.value = 'xyz';
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    expect(shadowRoot?.textContent).toContain('No matching items');
  });

  it('should filter case-insensitively', () => {
    element.config = {
      showFilter: true
    };
    
    const nodes: TreeNode[] = [
      { name: 'Apple', id: 1 },
      { name: 'BANANA', id: 2 },
      { name: 'CheRRy', id: 3 }
    ];
    
    element.data = nodes;
    
    const shadowRoot = element.shadowRoot;
    const filterInputEl = shadowRoot?.querySelector('filter-input');
    const filterInputShadow = filterInputEl?.shadowRoot;
    const filterInput = filterInputShadow?.querySelector('.filter-input') as HTMLInputElement;
    
    // Filter with lowercase
    filterInput.value = 'banana';
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    expect(shadowRoot?.textContent).toContain('BANANA');
    
    // Filter with mixed case
    filterInput.value = 'ChErRy';
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    expect(shadowRoot?.textContent).toContain('CheRRy');
  });

  it('should render icon buttons on leaf nodes when configured', () => {
    const mockIcon = '<svg><circle/></svg>';
    let clickedNode: TreeNode | null = null;
    
    element.config = {
      leafIconButtons: (node: TreeNode) => {
        return [{
          icon: mockIcon,
          tooltip: 'Test Action',
          onClick: (node: TreeNode) => {
            clickedNode = node;
          }
        }];
      }
    };
    
    const nodes: TreeNode[] = [
      { name: 'Test Node', id: 42 }
    ];
    
    element.data = nodes;
    
    const shadowRoot = element.shadowRoot;
    const button = shadowRoot?.querySelector('.tree-icon-button') as HTMLButtonElement;
    
    expect(button).toBeTruthy();
    expect(button.title).toBe('Test Action');
    expect(button.innerHTML).toContain('<svg>');
    
    // Click the button
    button.click();
    
    expect(clickedNode).not.toBeNull();
    expect(clickedNode?.name).toBe('Test Node');
    expect(clickedNode?.id).toBe(42);
  });

  it('should render icon buttons on branch nodes when configured', () => {
    const mockIcon = '<svg><rect/></svg>';
    let clickedNode: TreeNode | null = null;
    
    element.config = {
      branchIconButtons: (node: TreeNode) => {
        return [{
          icon: mockIcon,
          tooltip: 'Branch Action',
          onClick: (node: TreeNode) => {
            clickedNode = node;
          }
        }];
      }
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
    const button = shadowRoot?.querySelector('.tree-icon-button') as HTMLButtonElement;
    
    expect(button).toBeTruthy();
    expect(button.title).toBe('Branch Action');
    expect(button.innerHTML).toContain('<svg>');
    
    // Click the button
    button.click();
    
    expect(clickedNode).not.toBeNull();
    expect(clickedNode?.name).toBe('Parent');
    expect(clickedNode?.id).toBe(1);
  });

  it('should not trigger parent click when icon button is clicked', () => {
    const mockIcon = '<svg><circle/></svg>';
    let leafClicked = false;
    let buttonClicked = false;
    
    element.config = {
      onLeafClick: () => {
        leafClicked = true;
      },
      leafIconButtons: (node: TreeNode) => {
        return [{
          icon: mockIcon,
          tooltip: 'Test',
          onClick: () => {
            buttonClicked = true;
          }
        }];
      }
    };
    
    const nodes: TreeNode[] = [
      { name: 'Test', id: 1 }
    ];
    
    element.data = nodes;
    
    const shadowRoot = element.shadowRoot;
    const button = shadowRoot?.querySelector('.tree-icon-button') as HTMLButtonElement;
    
    button.click();
    
    expect(buttonClicked).toBe(true);
    expect(leafClicked).toBe(false);
  });

  it('should apply left text alignment by default', () => {
    element.config = {};
    
    const nodes: TreeNode[] = [
      { name: 'Test Node', id: 1 }
    ];
    
    element.data = nodes;
    
    // Check that the CSS variable is set for left alignment
    expect(element.style.getPropertyValue('--tree-leaf-justify')).toBe('flex-start');
    expect(element.style.getPropertyValue('--tree-leaf-direction')).toBe('row');
  });

  it('should apply right text alignment when configured', () => {
    element.config = {
      textAlign: 'right'
    };
    
    const nodes: TreeNode[] = [
      { name: 'Test Node', id: 1 }
    ];
    
    element.data = nodes;
    
    // Check that the CSS variable is set for right alignment
    expect(element.style.getPropertyValue('--tree-leaf-justify')).toBe('flex-end');
    expect(element.style.getPropertyValue('--tree-leaf-direction')).toBe('row-reverse');
  });

  it('should apply left text alignment when explicitly configured', () => {
    element.config = {
      textAlign: 'left'
    };
    
    const nodes: TreeNode[] = [
      { name: 'Test Node', id: 1 }
    ];
    
    element.data = nodes;
    
    // Check that the CSS variable is set for left alignment
    expect(element.style.getPropertyValue('--tree-leaf-justify')).toBe('flex-start');
    expect(element.style.getPropertyValue('--tree-leaf-direction')).toBe('row');
  });

  it('should support case-sensitive filtering', () => {
    element.config = {
      showFilter: true
    };
    
    const nodes: TreeNode[] = [
      { name: 'Apple', id: 1 },
      { name: 'apple', id: 2 },
      { name: 'APPLE', id: 3 }
    ];
    
    element.data = nodes;
    
    const shadowRoot = element.shadowRoot;
    const filterInputEl = shadowRoot?.querySelector('filter-input');
    const filterInputShadow = filterInputEl?.shadowRoot;
    const filterInput = filterInputShadow?.querySelector('.filter-input') as HTMLInputElement;
    const caseSensitiveButton = filterInputShadow?.querySelector('.filter-toggle') as HTMLButtonElement;
    
    // Enable case-sensitive filtering
    caseSensitiveButton.click();
    
    // Search for lowercase "apple"
    filterInput.value = 'apple';
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Only exact lowercase match should be visible
    expect(shadowRoot?.textContent).not.toContain('Apple');
    expect(shadowRoot?.textContent).toContain('apple');
    expect(shadowRoot?.textContent).not.toContain('APPLE');
  });

  it('should support whole word filtering', () => {
    element.config = {
      showFilter: true
    };
    
    const nodes: TreeNode[] = [
      { name: 'test', id: 1 },
      { name: 'testing', id: 2 },
      { name: 'test data', id: 3 },
      { name: 'my test', id: 4 },
      { name: 'test123', id: 5 }
    ];
    
    element.data = nodes;
    
    const shadowRoot = element.shadowRoot;
    const filterInputEl = shadowRoot?.querySelector('filter-input');
    const filterInputShadow = filterInputEl?.shadowRoot;
    const filterInput = filterInputShadow?.querySelector('.filter-input') as HTMLInputElement;
    const buttons = filterInputShadow?.querySelectorAll('.filter-toggle');
    const wholeWordButton = buttons?.[1] as HTMLButtonElement;
    
    // Enable whole word filtering
    wholeWordButton.click();
    
    // Search for "test" as whole word
    filterInput.value = 'test';
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Only nodes with "test" as a complete word (separated by spaces or boundaries) should match
    expect(shadowRoot?.textContent).toContain('test');
    expect(shadowRoot?.textContent).not.toContain('testing');
    expect(shadowRoot?.textContent).toContain('test data');
    expect(shadowRoot?.textContent).toContain('my test');
    expect(shadowRoot?.textContent).not.toContain('test123');
  });

  it('should support regex filtering', () => {
    element.config = {
      showFilter: true
    };
    
    const nodes: TreeNode[] = [
      { name: 'data_in', id: 1 },
      { name: 'data_out', id: 2 },
      { name: 'clock', id: 3 },
      { name: 'reset', id: 4 }
    ];
    
    element.data = nodes;
    
    const shadowRoot = element.shadowRoot;
    const filterInputEl = shadowRoot?.querySelector('filter-input');
    const filterInputShadow = filterInputEl?.shadowRoot;
    const filterInput = filterInputShadow?.querySelector('.filter-input') as HTMLInputElement;
    const buttons = filterInputShadow?.querySelectorAll('.filter-toggle');
    const regexButton = buttons?.[2] as HTMLButtonElement;
    
    // Enable regex filtering
    regexButton.click();
    
    // Search for pattern "data_.*"
    filterInput.value = 'data_.*';
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Only data_in and data_out should match
    expect(shadowRoot?.textContent).toContain('data_in');
    expect(shadowRoot?.textContent).toContain('data_out');
    expect(shadowRoot?.textContent).not.toContain('clock');
    expect(shadowRoot?.textContent).not.toContain('reset');
  });

  it('should handle invalid regex gracefully', () => {
    element.config = {
      showFilter: true
    };
    
    const nodes: TreeNode[] = [
      { name: 'test1', id: 1 },
      { name: 'test2', id: 2 }
    ];
    
    element.data = nodes;
    
    const shadowRoot = element.shadowRoot;
    const filterInputEl = shadowRoot?.querySelector('filter-input');
    const filterInputShadow = filterInputEl?.shadowRoot;
    const filterInput = filterInputShadow?.querySelector('.filter-input') as HTMLInputElement;
    const buttons = filterInputShadow?.querySelectorAll('.filter-toggle');
    const regexButton = buttons?.[2] as HTMLButtonElement;
    
    // Enable regex filtering
    regexButton.click();
    
    // Enter invalid regex pattern
    filterInput.value = '[invalid(';
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Should fall back to substring search (all items should be hidden as "[invalid(" doesn't match)
    expect(shadowRoot?.textContent).toContain('No matching items');
  });

  it('should combine case-sensitive and regex options', () => {
    element.config = {
      showFilter: true
    };
    
    const nodes: TreeNode[] = [
      { name: 'Test', id: 1 },
      { name: 'test', id: 2 },
      { name: 'TEST', id: 3 }
    ];
    
    element.data = nodes;
    
    const shadowRoot = element.shadowRoot;
    const filterInputEl = shadowRoot?.querySelector('filter-input');
    const filterInputShadow = filterInputEl?.shadowRoot;
    const filterInput = filterInputShadow?.querySelector('.filter-input') as HTMLInputElement;
    const buttons = filterInputShadow?.querySelectorAll('.filter-toggle');
    const caseSensitiveButton = buttons?.[0] as HTMLButtonElement;
    const regexButton = buttons?.[2] as HTMLButtonElement;
    
    // Enable both case-sensitive and regex
    caseSensitiveButton.click();
    regexButton.click();
    
    // Search for lowercase pattern
    filterInput.value = '^test$';
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Only lowercase "test" should match
    expect(shadowRoot?.textContent).not.toContain('Test');
    expect(shadowRoot?.textContent).toContain('test');
    expect(shadowRoot?.textContent).not.toContain('TEST');
  });
});
