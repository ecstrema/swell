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
});
