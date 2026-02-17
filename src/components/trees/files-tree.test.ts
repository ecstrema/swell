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
    const filterInputEl = shadowRoot?.querySelector('filter-input');
    expect(filterInputEl).toBeTruthy();
    const filterContainer = shadowRoot?.querySelector('#filter-container') as HTMLElement;
    expect(filterContainer.style.display).not.toBe('none');
  });

  it('should support filtering when enabled in config', () => {
    // Note: Filtering is now enabled by default, but this test
    // explicitly sets the config to verify it can still be configured
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
    const filterInputEl = shadowRoot?.querySelector('filter-input');
    const filterInputShadow = filterInputEl?.shadowRoot;
    const filterInput = filterInputShadow?.querySelector('.filter-input') as HTMLInputElement;
    expect(filterInputEl).toBeTruthy();
    
    // Initially all signals visible
    expect(shadowRoot?.textContent).toContain('clk');
    expect(shadowRoot?.textContent).toContain('reset');
    expect(shadowRoot?.textContent).toContain('data_out');
    expect(shadowRoot?.textContent).toContain('data_in');
    
    // Filter for "data"
    filterInput.value = 'data';
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Only data signals should be visible
    expect(shadowRoot?.textContent).not.toContain('clk');
    expect(shadowRoot?.textContent).not.toContain('reset');
    expect(shadowRoot?.textContent).toContain('module1');
    expect(shadowRoot?.textContent).toContain('data_out');
    expect(shadowRoot?.textContent).toContain('data_in');
    
    // Filter for "clk"
    filterInput.value = 'clk';
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Only clk should be visible
    expect(shadowRoot?.textContent).toContain('clk');
    expect(shadowRoot?.textContent).not.toContain('reset');
    expect(shadowRoot?.textContent).not.toContain('data_out');
  });

  it('should show icon button on scope nodes with direct signal children', () => {
    const hierarchy: HierarchyRoot = {
      name: 'top',
      ref: 0,
      vars: [],
      scopes: [
        {
          name: 'module1',
          ref: 1,
          vars: [
            { name: 'signal1', ref: 2 },
            { name: 'signal2', ref: 3 }
          ],
          scopes: []
        }
      ]
    };
    
    element.hierarchyData = hierarchy;
    
    const shadowRoot = element.shadowRoot;
    const button = shadowRoot?.querySelector('.tree-icon-button') as HTMLButtonElement;
    
    expect(button).toBeTruthy();
    expect(button.title).toBe('Add all signals in this group');
  });

  it('should dispatch checkbox-toggle events when "add all signals" button is clicked', async () => {
    const hierarchy: HierarchyRoot = {
      name: 'top',
      ref: 0,
      vars: [],
      scopes: [
        {
          name: 'module1',
          ref: 1,
          vars: [
            { name: 'signal1', ref: 2 },
            { name: 'signal2', ref: 3 }
          ],
          scopes: []
        }
      ]
    };
    
    element.filename = 'test.vcd';
    element.hierarchyData = hierarchy;
    
    // Collect events
    const events: CustomEvent[] = [];
    const eventPromise = new Promise<void>((resolve) => {
      let eventCount = 0;
      element.addEventListener('checkbox-toggle', (e: Event) => {
        events.push(e as CustomEvent);
        eventCount++;
        if (eventCount === 2) {
          resolve();
        }
      });
    });
    
    const shadowRoot = element.shadowRoot;
    const button = shadowRoot?.querySelector('.tree-icon-button') as HTMLButtonElement;
    
    button.click();
    
    await eventPromise;
    
    expect(events.length).toBe(2);
    expect(events[0].detail.name).toBe('signal1');
    expect(events[0].detail.ref).toBe(2);
    expect(events[0].detail.checked).toBe(true);
    expect(events[1].detail.name).toBe('signal2');
    expect(events[1].detail.ref).toBe(3);
    expect(events[1].detail.checked).toBe(true);
  });

  it('should only add direct children, not recursive descendants', () => {
    const hierarchy: HierarchyRoot = {
      name: 'top',
      ref: 0,
      vars: [],
      scopes: [
        {
          name: 'module1',
          ref: 1,
          vars: [
            { name: 'signal1', ref: 2 }
          ],
          scopes: [
            {
              name: 'submodule',
              ref: 3,
              vars: [
                { name: 'nested_signal', ref: 4 }
              ],
              scopes: []
            }
          ]
        }
      ]
    };
    
    element.filename = 'test.vcd';
    element.hierarchyData = hierarchy;
    
    // Collect events
    const events: CustomEvent[] = [];
    element.addEventListener('checkbox-toggle', (e: Event) => {
      events.push(e as CustomEvent);
    });
    
    const shadowRoot = element.shadowRoot;
    const button = shadowRoot?.querySelector('.tree-icon-button') as HTMLButtonElement;
    
    button.click();
    
    // Should only have one event for signal1, not nested_signal
    expect(events.length).toBe(1);
    expect(events[0].detail.name).toBe('signal1');
    expect(events[0].detail.ref).toBe(2);
  });

  it('should show checkboxes on branch nodes', () => {
    const hierarchy: HierarchyRoot = {
      name: 'top',
      ref: 0,
      vars: [
        { name: 'signal1', ref: 1 }
      ],
      scopes: [
        {
          name: 'module1',
          ref: 2,
          vars: [
            { name: 'signal2', ref: 3 }
          ],
          scopes: []
        }
      ]
    };
    
    element.hierarchyData = hierarchy;
    
    const shadowRoot = element.shadowRoot;
    // Should have checkboxes on both leaf and branch nodes
    const leafCheckbox = shadowRoot?.querySelector('.leaf-checkbox') as HTMLInputElement;
    const branchCheckbox = shadowRoot?.querySelector('.branch-checkbox') as HTMLInputElement;
    
    expect(leafCheckbox).toBeTruthy();
    expect(branchCheckbox).toBeTruthy();
  });

  it('should set branch checkbox to checked when all descendants are selected', () => {
    const hierarchy: HierarchyRoot = {
      name: 'top',
      ref: 0,
      vars: [],
      scopes: [
        {
          name: 'module1',
          ref: 1,
          vars: [
            { name: 'signal1', ref: 2 },
            { name: 'signal2', ref: 3 }
          ],
          scopes: []
        }
      ]
    };
    
    element.hierarchyData = hierarchy;
    
    // Initially no signals selected
    let branchCheckbox = element.shadowRoot?.querySelector('.branch-checkbox') as HTMLInputElement;
    expect(branchCheckbox.checked).toBe(false);
    expect(branchCheckbox.indeterminate).toBe(false);
    
    // Select all descendant signals
    element.selectedSignalRefs = [2, 3];
    
    // Branch checkbox should now be fully checked
    branchCheckbox = element.shadowRoot?.querySelector('.branch-checkbox') as HTMLInputElement;
    expect(branchCheckbox.checked).toBe(true);
    expect(branchCheckbox.indeterminate).toBe(false);
  });

  it('should set branch checkbox to indeterminate when some descendants are selected', () => {
    const hierarchy: HierarchyRoot = {
      name: 'top',
      ref: 0,
      vars: [],
      scopes: [
        {
          name: 'module1',
          ref: 1,
          vars: [
            { name: 'signal1', ref: 2 },
            { name: 'signal2', ref: 3 }
          ],
          scopes: []
        }
      ]
    };
    
    element.hierarchyData = hierarchy;
    
    // Select only one of two signals
    element.selectedSignalRefs = [2];
    
    // Branch checkbox should be indeterminate
    const branchCheckbox = element.shadowRoot?.querySelector('.branch-checkbox') as HTMLInputElement;
    expect(branchCheckbox.checked).toBe(false);
    expect(branchCheckbox.indeterminate).toBe(true);
  });

  it('should handle nested hierarchy indeterminate state correctly', () => {
    const hierarchy: HierarchyRoot = {
      name: 'top',
      ref: 0,
      vars: [],
      scopes: [
        {
          name: 'module1',
          ref: 1,
          vars: [
            { name: 'signal1', ref: 2 }
          ],
          scopes: [
            {
              name: 'submodule',
              ref: 3,
              vars: [
                { name: 'signal2', ref: 4 },
                { name: 'signal3', ref: 5 }
              ],
              scopes: []
            }
          ]
        }
      ]
    };
    
    element.hierarchyData = hierarchy;
    
    // Select one nested signal
    element.selectedSignalRefs = [4];
    
    // Both parent and grandparent should be indeterminate
    const branchCheckboxes = element.shadowRoot?.querySelectorAll('.branch-checkbox') as NodeListOf<HTMLInputElement>;
    expect(branchCheckboxes.length).toBe(2);
    
    // Both should be indeterminate since not all descendants are selected
    branchCheckboxes.forEach(checkbox => {
      expect(checkbox.checked).toBe(false);
      expect(checkbox.indeterminate).toBe(true);
    });
  });

  it('should toggle all descendants when branch checkbox is clicked', async () => {
    const hierarchy: HierarchyRoot = {
      name: 'top',
      ref: 0,
      vars: [],
      scopes: [
        {
          name: 'module1',
          ref: 1,
          vars: [
            { name: 'signal1', ref: 2 },
            { name: 'signal2', ref: 3 }
          ],
          scopes: [
            {
              name: 'submodule',
              ref: 4,
              vars: [
                { name: 'signal3', ref: 5 }
              ],
              scopes: []
            }
          ]
        }
      ]
    };
    
    element.filename = 'test.vcd';
    element.hierarchyData = hierarchy;
    
    // Collect events
    const events: CustomEvent[] = [];
    const eventPromise = new Promise<void>((resolve) => {
      let eventCount = 0;
      element.addEventListener('checkbox-toggle', (e: Event) => {
        events.push(e as CustomEvent);
        eventCount++;
        // Should receive 3 events (one for each descendant signal)
        if (eventCount === 3) {
          resolve();
        }
      });
    });
    
    const shadowRoot = element.shadowRoot;
    const branchCheckbox = shadowRoot?.querySelector('.branch-checkbox') as HTMLInputElement;
    
    // Click the branch checkbox to select all descendants
    branchCheckbox.click();
    
    await eventPromise;
    
    // Should have events for all 3 descendant signals
    expect(events.length).toBe(3);
    expect(events.map(e => e.detail.ref).sort()).toEqual([2, 3, 5]);
    expect(events.every(e => e.detail.checked === true)).toBe(true);
  });

  it('should uncheck all descendants when checked branch checkbox is clicked', async () => {
    const hierarchy: HierarchyRoot = {
      name: 'top',
      ref: 0,
      vars: [],
      scopes: [
        {
          name: 'module1',
          ref: 1,
          vars: [
            { name: 'signal1', ref: 2 },
            { name: 'signal2', ref: 3 }
          ],
          scopes: []
        }
      ]
    };
    
    element.filename = 'test.vcd';
    element.hierarchyData = hierarchy;
    
    // Pre-select all signals
    element.selectedSignalRefs = [2, 3];
    
    // Collect events
    const events: CustomEvent[] = [];
    const eventPromise = new Promise<void>((resolve) => {
      let eventCount = 0;
      element.addEventListener('checkbox-toggle', (e: Event) => {
        events.push(e as CustomEvent);
        eventCount++;
        if (eventCount === 2) {
          resolve();
        }
      });
    });
    
    const shadowRoot = element.shadowRoot;
    const branchCheckbox = shadowRoot?.querySelector('.branch-checkbox') as HTMLInputElement;
    
    // Verify it's checked
    expect(branchCheckbox.checked).toBe(true);
    
    // Click to uncheck all
    branchCheckbox.click();
    
    await eventPromise;
    
    // Should have unchecked events for both signals
    expect(events.length).toBe(2);
    expect(events.map(e => e.detail.ref).sort()).toEqual([2, 3]);
    expect(events.every(e => e.detail.checked === false)).toBe(true);
  });
});
