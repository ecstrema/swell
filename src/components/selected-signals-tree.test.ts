import { describe, it, expect, beforeEach } from 'vitest';
import './selected-signals-tree.js';
import { SelectedSignalsTree, SelectedSignal } from './selected-signals-tree.js';

describe('SelectedSignalsTree Component', () => {
  let element: SelectedSignalsTree;

  beforeEach(() => {
    element = document.createElement('selected-signals-tree') as SelectedSignalsTree;
    document.body.appendChild(element);
  });

  it('should render without errors', () => {
    expect(element).toBeTruthy();
    expect(element.shadowRoot).toBeTruthy();
  });

  it('should display empty message when no signals', () => {
    element.signals = [];
    const shadowRoot = element.shadowRoot;
    expect(shadowRoot?.textContent).toContain('No items');
  });

  it('should render selected signals', () => {
    const signals: SelectedSignal[] = [
      { name: 'clk', ref: 1 },
      { name: 'reset', ref: 2 },
      { name: 'data_out', ref: 3 }
    ];
    
    element.signals = signals;
    
    const shadowRoot = element.shadowRoot;
    expect(shadowRoot?.textContent).toContain('clk');
    expect(shadowRoot?.textContent).toContain('reset');
    expect(shadowRoot?.textContent).toContain('data_out');
  });

  it('should update when signals change', () => {
    element.signals = [{ name: 'signal1', ref: 1 }];
    
    let shadowRoot = element.shadowRoot;
    expect(shadowRoot?.textContent).toContain('signal1');
    
    element.signals = [
      { name: 'signal1', ref: 1 },
      { name: 'signal2', ref: 2 }
    ];
    
    shadowRoot = element.shadowRoot;
    expect(shadowRoot?.textContent).toContain('signal1');
    expect(shadowRoot?.textContent).toContain('signal2');
  });

  it('should render signals with signal-node class', () => {
    const signals: SelectedSignal[] = [
      { name: 'test_signal', ref: 42 }
    ];
    
    element.signals = signals;
    
    const shadowRoot = element.shadowRoot;
    const signalNode = shadowRoot?.querySelector('.signal-node');
    expect(signalNode).toBeTruthy();
    expect(signalNode?.textContent).toBe('test_signal');
  });

  it('should support filtering when enabled in config', () => {
    // Enable filtering
    element.config = {
      ...element.config,
      showFilter: true
    };

    const signals: SelectedSignal[] = [
      { name: 'clk', ref: 1 },
      { name: 'reset', ref: 2 },
      { name: 'data_out', ref: 3 },
      { name: 'data_in', ref: 4 }
    ];
    
    element.signals = signals;
    
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

  it('should render signals as draggable', () => {
    const signals: SelectedSignal[] = [
      { name: 'signal1', ref: 1 },
      { name: 'signal2', ref: 2 }
    ];
    
    element.signals = signals;
    
    const shadowRoot = element.shadowRoot;
    const leafNodes = shadowRoot?.querySelectorAll('.leaf-node');
    
    // Check that leaf nodes have draggable attribute
    expect(leafNodes?.length).toBe(2);
    leafNodes?.forEach(node => {
      expect((node as HTMLElement).draggable).toBe(true);
    });
  });

  it('should have drag-and-drop handlers configured in tree config', () => {
    // Check that the tree view config has drag-and-drop enabled
    expect(element.config.draggableLeaves).toBe(true);
    expect(element.config.onDrop).toBeDefined();
  });

  it('should use right text alignment for selected signals', () => {
    // Check that the tree view config has right alignment
    expect(element.config.textAlign).toBe('right');
    
    // Check that the CSS variables are set correctly
    expect(element.style.getPropertyValue('--tree-leaf-justify')).toBe('flex-end');
    expect(element.style.getPropertyValue('--tree-leaf-direction')).toBe('row-reverse');
  });
});
