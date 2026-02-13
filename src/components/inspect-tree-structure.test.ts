import { describe, it, expect, beforeEach } from 'vitest';
import './tree-view.js';
import { TreeView, TreeNode } from './tree-view.js';

describe('Tree Structure Inspection', () => {
  let element: TreeView;

  beforeEach(() => {
    element = document.createElement('tree-view') as TreeView;
    document.body.appendChild(element);
  });

  it('should show the HTML structure for debugging', () => {
    const nodes: TreeNode[] = [
      {
        name: 'Root',
        id: 1,
        children: [
          {
            name: 'Child 1',
            id: 2,
            children: [
              { name: 'Grandchild 1', id: 3 }
            ]
          },
          { name: 'Child 2', id: 4 }
        ]
      }
    ];
    
    element.data = nodes;
    
    const container = element.shadowRoot?.querySelector('#tree-container');
    console.log('=== TREE STRUCTURE ===');
    console.log(container?.innerHTML);
    console.log('======================');
    
    // Check structure
    const details = container?.querySelectorAll('details');
    expect(details).toBeTruthy();
    console.log(`Found ${details?.length} details elements`);
    
    // Print details about each details element
    details?.forEach((detail, i) => {
      console.log(`\nDetails ${i}:`);
      console.log(`  Class: ${detail.className}`);
      console.log(`  Direct children count: ${detail.children.length}`);
      console.log(`  Children: ${Array.from(detail.children).map(c => c.tagName).join(', ')}`);
      
      // Check nesting level
      let level = 0;
      let parent = detail.parentElement;
      while (parent && parent !== container) {
        if (parent.tagName === 'DETAILS') level++;
        parent = parent.parentElement;
      }
      console.log(`  Nesting level: ${level}`);
    });
  });
});
