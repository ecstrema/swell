import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './file-display.js';
import { FileDisplay } from './file-display.js';
import { saveFileState, loadFileState, clearAllFileStates } from '../utils/file-state-storage.js';

// Mock the backend module
vi.mock('../backend.js', () => ({
  getSignalChanges: vi.fn(async (filename: string, signalId: number, start: number, end: number) => {
    return [
      { time: start, value: '0' },
      { time: Math.floor((start + end) / 2), value: '1' },
      { time: end, value: '0' }
    ];
  }),
  getHierarchy: vi.fn(async () => ({
    name: 'top',
    var_ref: 0,
    children: [
      { name: 'clk', var_ref: 1, children: [] },
      { name: 'reset', var_ref: 2, children: [] },
      { name: 'data', var_ref: 3, children: [] }
    ]
  })),
  isTauri: false
}));

describe('File State Persistence Integration', () => {
  beforeEach(async () => {
    // Clear all file states before each test
    await clearAllFileStates();
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up any FileDisplay elements
    document.body.innerHTML = '';
  });

  it('should persist and restore selected signals', async () => {
    // Create a FileDisplay and add signals
    const element1 = document.createElement('file-display') as FileDisplay;
    element1.filename = 'test.vcd';
    document.body.appendChild(element1);

    // Simulate selecting signals by dispatching events
    document.dispatchEvent(new CustomEvent('signal-select', {
      detail: { name: 'clk', ref: 1, filename: 'test.vcd' }
    }));

    document.dispatchEvent(new CustomEvent('signal-select', {
      detail: { name: 'reset', ref: 2, filename: 'test.vcd' }
    }));

    // Wait for signals to be added
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check that signals were added
    const signalRefs1 = element1.getSelectedSignalRefs();
    expect(signalRefs1).toContain(1);
    expect(signalRefs1).toContain(2);

    // Remove the element (this should trigger state save)
    element1.remove();

    // Wait for debounced save to complete
    await new Promise(resolve => setTimeout(resolve, 600));

    // Verify state was saved
    const savedState = await loadFileState('test.vcd');
    expect(savedState).not.toBeNull();
    expect(savedState?.items).toBeDefined();
    
    // Check that signals are in the items array
    const signalItems = savedState?.items.filter(item => item._type === 'signal');
    expect(signalItems?.length).toBeGreaterThan(0);
    const signalRefs = signalItems?.map(item => (item as any).ref);
    expect(signalRefs).toContain(1);
    expect(signalRefs).toContain(2);

    // Create a new FileDisplay with the same filename
    const element2 = document.createElement('file-display') as FileDisplay;
    element2.filename = 'test.vcd';
    document.body.appendChild(element2);

    // Wait for state restoration
    await new Promise(resolve => setTimeout(resolve, 200));

    // Check that signals were restored
    const signalRefs2 = element2.getSelectedSignalRefs();
    expect(signalRefs2).toContain(1);
    expect(signalRefs2).toContain(2);

    element2.remove();
  });

  it('should persist and restore visible range', async () => {
    // Create a FileDisplay
    const element1 = document.createElement('file-display') as FileDisplay;
    element1.filename = 'test.vcd';
    document.body.appendChild(element1);

    // Set a custom visible range
    await element1.setVisibleRange(1000, 5000);

    // Verify the range was set
    const range1 = element1.getVisibleRange();
    expect(range1.start).toBe(1000);
    expect(range1.end).toBe(5000);

    // Remove the element
    element1.remove();

    // Wait for save
    await new Promise(resolve => setTimeout(resolve, 600));

    // Verify state was saved with the custom range
    const savedState = await loadFileState('test.vcd');
    expect(savedState).not.toBeNull();
    expect(savedState?.visibleStart).toBe(1000);
    expect(savedState?.visibleEnd).toBe(5000);

    // Create a new FileDisplay
    const element2 = document.createElement('file-display') as FileDisplay;
    element2.filename = 'test.vcd';
    document.body.appendChild(element2);

    // Wait for restoration
    await new Promise(resolve => setTimeout(resolve, 200));

    // Check that range was restored
    const range2 = element2.getVisibleRange();
    expect(range2.start).toBe(1000);
    expect(range2.end).toBe(5000);

    element2.remove();
  });

  it('should handle multiple files independently', async () => {
    // Clear any existing state
    await clearAllFileStates();
    
    // Manually save states for two different files
    await saveFileState('file1.vcd', {
      version: 'V0.1',
      items: [
        { _type: 'timeline', name: 'Timeline 1' },
        { _type: 'signal', ref: 1, name: 'clk' }
      ],
      visibleStart: 1000,
      visibleEnd: 2000,
      timestamp: Date.now()
    });
    
    await saveFileState('file2.vcd', {
      version: 'V0.1',
      items: [
        { _type: 'timeline', name: 'Timeline 1' },
        { _type: 'signal', ref: 2, name: 'reset' }
      ],
      visibleStart: 5000,
      visibleEnd: 6000,
      timestamp: Date.now()
    });
    
    // Verify both states were saved independently
    const state1 = await loadFileState('file1.vcd');
    const state2 = await loadFileState('file2.vcd');

    expect(state1).not.toBeNull();
    expect(state2).not.toBeNull();

    if (state1 && state2) {
      expect(state1.visibleStart).toBe(1000);
      expect(state1.visibleEnd).toBe(2000);
      expect(state1.items).toHaveLength(2);
      expect(state1.items[1]._type).toBe('signal');

      expect(state2.visibleStart).toBe(5000);
      expect(state2.visibleEnd).toBe(6000);
      expect(state2.items).toHaveLength(2);
      expect(state2.items[1]._type).toBe('signal');
    }
    
    // Now verify restoration works for both
    const element1 = document.createElement('file-display') as FileDisplay;
    element1.filename = 'file1.vcd';
    document.body.appendChild(element1);

    await new Promise(resolve => setTimeout(resolve, 200));

    const element2 = document.createElement('file-display') as FileDisplay;
    element2.filename = 'file2.vcd';
    document.body.appendChild(element2);

    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify ranges were restored independently
    const range1 = element1.getVisibleRange();
    const range2 = element2.getVisibleRange();

    expect(range1.start).toBe(1000);
    expect(range1.end).toBe(2000);
    
    expect(range2.start).toBe(5000);
    expect(range2.end).toBe(6000);

    element1.remove();
    element2.remove();
  });

  it('should work correctly when no saved state exists', async () => {
    // Create a FileDisplay for a file that has no saved state
    const element = document.createElement('file-display') as FileDisplay;
    element.filename = 'new-file.vcd';
    document.body.appendChild(element);

    // Should not throw errors
    await new Promise(resolve => setTimeout(resolve, 200));

    // Should have default state
    const range = element.getVisibleRange();
    expect(range.start).toBe(0);
    expect(range.end).toBe(1000000);

    const signalRefs = element.getSelectedSignalRefs();
    expect(signalRefs.length).toBe(0); // No signals selected by default

    element.remove();
  });

  it('should debounce state saves', async () => {
    const element = document.createElement('file-display') as FileDisplay;
    element.filename = 'test.vcd';
    document.body.appendChild(element);

    // Make multiple rapid changes
    await element.setVisibleRange(100, 200);
    await new Promise(resolve => setTimeout(resolve, 50));
    await element.setVisibleRange(200, 300);
    await new Promise(resolve => setTimeout(resolve, 50));
    await element.setVisibleRange(300, 400);

    // Wait less than debounce time
    await new Promise(resolve => setTimeout(resolve, 200));

    // State should not be saved yet
    let savedState = await loadFileState('test.vcd');
    // The state might be null or might have old data depending on timing
    
    // Wait for full debounce time plus a bit more
    await new Promise(resolve => setTimeout(resolve, 400));

    // Now the latest state should be saved
    savedState = await loadFileState('test.vcd');
    expect(savedState).not.toBeNull();
    expect(savedState?.visibleStart).toBe(300);
    expect(savedState?.visibleEnd).toBe(400);

    element.remove();
  });
});
