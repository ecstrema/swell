import { describe, it, expect, beforeEach } from 'vitest';
import './files-tree.js';
import { FilesTree, HierarchyRoot } from './files-tree.js';

describe('FilesTree Component', () => {
  let element: FilesTree;

  beforeEach(() => {
    element = document.createElement('files-tree') as FilesTree;
    document.body.appendChild(element);
  });

  it('should render without errors', () => {
    expect(element).toBeTruthy();
    expect(element.shadowRoot).toBeTruthy();
  });

  it('should display empty message when no data', () => {
    element.hierarchyData = null;
    const shadowRoot = element.shadowRoot;
    expect(shadowRoot?.textContent).toContain('No items');
  });

  it('should render hierarchy data with signals', () => {
    const hierarchy: HierarchyRoot = {
      name: 'top',
      ref: 0,
      vars: [
        { name: 'clk', ref: 1 },
        { name: 'reset', ref: 2 }
      ],
      scopes: [
        {
          name: 'module1',
          ref: 3,
          vars: [
            { name: 'data_out', ref: 4 }
          ],
          scopes: []
        }
      ]
    };
    
    element.hierarchyData = hierarchy;
    
    const shadowRoot = element.shadowRoot;
    expect(shadowRoot?.textContent).toContain('clk');
    expect(shadowRoot?.textContent).toContain('reset');
    expect(shadowRoot?.textContent).toContain('module1');
    expect(shadowRoot?.textContent).toContain('data_out');
  });

  it('should show checkboxes for signals', () => {
    const hierarchy: HierarchyRoot = {
      name: 'top',
      ref: 0,
      vars: [
        { name: 'clk', ref: 1 }
      ],
      scopes: []
    };
    
    element.hierarchyData = hierarchy;
    
    const shadowRoot = element.shadowRoot;
    const checkbox = shadowRoot?.querySelector('.leaf-checkbox') as HTMLInputElement;
    expect(checkbox).toBeTruthy();
    expect(checkbox.type).toBe('checkbox');
  });

  it('should update checkboxes when selected signals change', () => {
    const hierarchy: HierarchyRoot = {
      name: 'top',
      ref: 0,
      vars: [
        { name: 'clk', ref: 1 },
        { name: 'reset', ref: 2 }
      ],
      scopes: []
    };
    
    element.hierarchyData = hierarchy;
    
    // Initially no signals selected
    let checkboxes = element.shadowRoot?.querySelectorAll('.leaf-checkbox') as NodeListOf<HTMLInputElement>;
    expect(checkboxes.length).toBe(2);
    expect(checkboxes[0].checked).toBe(false);
    expect(checkboxes[1].checked).toBe(false);
    
    // Select signal with ref 1
    element.selectedSignalRefs = [1];
    
    // Check that the first checkbox is now checked
    checkboxes = element.shadowRoot?.querySelectorAll('.leaf-checkbox') as NodeListOf<HTMLInputElement>;
    expect(checkboxes[0].checked).toBe(true);
    expect(checkboxes[1].checked).toBe(false);
    
    // Select both signals
    element.selectedSignalRefs = [1, 2];
    
    // Check that both checkboxes are now checked
    checkboxes = element.shadowRoot?.querySelectorAll('.leaf-checkbox') as NodeListOf<HTMLInputElement>;
    expect(checkboxes[0].checked).toBe(true);
    expect(checkboxes[1].checked).toBe(true);
    
    // Deselect all signals
    element.selectedSignalRefs = [];
    
    // Check that no checkboxes are checked
    checkboxes = element.shadowRoot?.querySelectorAll('.leaf-checkbox') as NodeListOf<HTMLInputElement>;
    expect(checkboxes[0].checked).toBe(false);
    expect(checkboxes[1].checked).toBe(false);
  });

  it('should dispatch signal-select event when leaf node is clicked', async () => {
    const hierarchy: HierarchyRoot = {
      name: 'top',
      ref: 0,
      vars: [
        { name: 'test_signal', ref: 42 }
      ],
      scopes: []
    };
    
    element.filename = 'test.vcd';
    element.hierarchyData = hierarchy;
    
    // Create a promise that resolves when the event is dispatched
    const eventPromise = new Promise<void>((resolve) => {
      element.addEventListener('signal-select', (e: Event) => {
        const customEvent = e as CustomEvent;
        expect(customEvent.detail.name).toBe('test_signal');
        expect(customEvent.detail.ref).toBe(42);
        expect(customEvent.detail.filename).toBe('test.vcd');
        resolve();
      }, { once: true });
    });
    
    const shadowRoot = element.shadowRoot;
    const leafNode = shadowRoot?.querySelector('.var-node') as HTMLElement;
    expect(leafNode).toBeTruthy();
    
    leafNode.click();
    
    await eventPromise;
  });

  it('should get selected signal refs', () => {
    element.selectedSignalRefs = [1, 2, 3];
    
    const refs = element.selectedSignalRefs;
    expect(refs).toEqual([1, 2, 3]);
  });

  it('should have filtering enabled by default', () => {
    const hierarchy: HierarchyRoot = {
      name: 'top',
      ref: 0,
      vars: [
        { name: 'signal_a', ref: 1 },
        { name: 'signal_b', ref: 2 }
      ],
      scopes: []
    };
    
    element.hierarchyData = hierarchy;
    
    const shadowRoot = element.shadowRoot;
    
    // Check filter input is visible by default
    const filterInput = shadowRoot?.querySelector('.filter-input') as HTMLInputElement;
    expect(filterInput).toBeTruthy();
    const filterContainer = shadowRoot?.querySelector('.filter-container') as HTMLElement;
    expect(filterContainer.style.display).not.toBe('none');
  });

  it('should support filtering when enabled in config', () => {
    // Note: Filtering is now enabled by default, but this test
    // explicitly sets the config to demonstrate backward compatibility
    element.config = {
      ...element.config,
      showFilter: true
    };

    const hierarchy: HierarchyRoot = {
      name: 'top',
      ref: 0,
      vars: [
        { name: 'clk', ref: 1 },
        { name: 'reset', ref: 2 }
      ],
      scopes: [
        {
          name: 'module1',
          ref: 3,
          vars: [
            { name: 'data_out', ref: 4 },
            { name: 'data_in', ref: 5 }
          ],
          scopes: []
        }
      ]
    };
    
    element.hierarchyData = hierarchy;
    
    const shadowRoot = element.shadowRoot;
    
    // Check filter input is visible
    const filterInput = shadowRoot?.querySelector('.filter-input') as HTMLInputElement;
    expect(filterInput).toBeTruthy();
    
    // Initially all signals visible
    expect(shadowRoot?.textContent).toContain('clk');
    expect(shadowRoot?.textContent).toContain('reset');
    expect(shadowRoot?.textContent).toContain('data_out');
    expect(shadowRoot?.textContent).toContain('data_in');
    
    // Filter for "data"
    filterInput.value = 'data';
    filterInput.dispatchEvent(new Event('input'));
    
    // Only data signals should be visible
    expect(shadowRoot?.textContent).not.toContain('clk');
    expect(shadowRoot?.textContent).not.toContain('reset');
    expect(shadowRoot?.textContent).toContain('module1');
    expect(shadowRoot?.textContent).toContain('data_out');
    expect(shadowRoot?.textContent).toContain('data_in');
    
    // Filter for "clk"
    filterInput.value = 'clk';
    filterInput.dispatchEvent(new Event('input'));
    
    // Only clk should be visible
    expect(shadowRoot?.textContent).toContain('clk');
    expect(shadowRoot?.textContent).not.toContain('reset');
    expect(shadowRoot?.textContent).not.toContain('data_out');
  });
});
