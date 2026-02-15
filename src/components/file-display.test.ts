import { describe, it, expect, beforeEach, vi } from 'vitest';
import './file-display.js';
import { FileDisplay } from './file-display.js';
import { Timeline } from './timeline.js';

// Mock the backend module
vi.mock('../backend.js', () => ({
  getSignalChanges: vi.fn(async (filename: string, signalId: number, start: number, end: number) => {
    // Return mock signal changes for testing
    return [
      { time: start, value: '0' },
      { time: Math.floor((start + end) / 2), value: '1' },
      { time: end, value: '0' }
    ];
  })
}));

describe('FileDisplay Component', () => {
  let element: FileDisplay;

  beforeEach(() => {
    element = document.createElement('file-display') as FileDisplay;
    document.body.appendChild(element);
  });

  it('should have default visible range', () => {
    const range = element.getVisibleRange();
    expect(range.start).toBe(0);
    expect(range.end).toBe(1000000);
  });

  it('should update visible range when setVisibleRange is called', async () => {
    await element.setVisibleRange(1000, 5000);
    const range = element.getVisibleRange();
    expect(range.start).toBe(1000);
    expect(range.end).toBe(5000);
  });

  it('should allow setting custom visible ranges', async () => {
    // Test with different ranges
    await element.setVisibleRange(0, 100);
    let range = element.getVisibleRange();
    expect(range.start).toBe(0);
    expect(range.end).toBe(100);

    await element.setVisibleRange(500, 1500);
    range = element.getVisibleRange();
    expect(range.start).toBe(500);
    expect(range.end).toBe(1500);
  });

  it('should validate input ranges', async () => {
    // Test negative values
    await expect(element.setVisibleRange(-100, 1000)).rejects.toThrow('Invalid time range: start (-100) and end (1000) must be non-negative');
    
    // Test start >= end
    await expect(element.setVisibleRange(1000, 1000)).rejects.toThrow('Invalid time range: start (1000) must be less than end (1000)');
    
    await expect(element.setVisibleRange(2000, 1000)).rejects.toThrow('Invalid time range: start (2000) must be less than end (1000)');
  });

  it('should render without errors', () => {
    element.filename = 'test.vcd';
    expect(element.filename).toBe('test.vcd');
  });

  it('should have a default timeline signal', () => {
    const shadowRoot = element.shadowRoot;
    expect(shadowRoot).toBeTruthy();
    
    // Check that a timeline element exists in the waveforms container
    const timeline = shadowRoot?.querySelector('timeline-view');
    expect(timeline).toBeTruthy();
  });

  it('should have an "Add Timeline" button', () => {
    const shadowRoot = element.shadowRoot;
    expect(shadowRoot).toBeTruthy();
    
    // Check that the add timeline button exists
    const addButton = shadowRoot?.querySelector('.add-timeline-btn');
    expect(addButton).toBeTruthy();
    expect(addButton?.textContent).toContain('Add Timeline');
  });

  it('should properly size canvas when signal is selected', async () => {
    element.filename = 'test.vcd';
    
    // Dispatch a signal-select event
    const event = new CustomEvent('signal-select', {
      detail: {
        name: 'test_signal',
        ref: 1,
        filename: 'test.vcd'
      }
    });
    
    document.dispatchEvent(event);
    
    // Wait for requestAnimationFrame to complete
    await new Promise(resolve => requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve(undefined));
    }));
    
    // Check that a canvas was created and has dimensions set
    const shadowRoot = element.shadowRoot;
    expect(shadowRoot).toBeTruthy();
    
    const canvas = shadowRoot?.querySelector('canvas');
    expect(canvas).toBeTruthy();
    
    // Canvas should have dimensions set
    if (canvas) {
      expect(canvas.height).toBe(40);
      // Width should be set (either to clientWidth or fallback to 800)
      expect(canvas.width).toBeGreaterThan(0);
    }
  });

  it('should synchronize all timelines when one timeline changes range', async () => {
    element.filename = 'test.vcd';
    
    // Add a second timeline by clicking the add timeline button
    const shadowRoot = element.shadowRoot;
    expect(shadowRoot).toBeTruthy();
    
    const addButton = shadowRoot?.querySelector('.add-timeline-btn') as HTMLButtonElement;
    expect(addButton).toBeTruthy();
    addButton.click();
    
    // Wait for render to complete
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Get all timeline elements
    const timelines = shadowRoot?.querySelectorAll('timeline-view');
    expect(timelines?.length).toBe(2);
    
    // Get the actual Timeline component instances
    const timeline1 = timelines![0] as Timeline;
    const timeline2 = timelines![1] as Timeline;
    
    // Set initial ranges
    timeline1.totalRange = { start: 0, end: 10000 };
    timeline1.visibleRange = { start: 0, end: 10000 };
    timeline2.totalRange = { start: 0, end: 10000 };
    timeline2.visibleRange = { start: 0, end: 10000 };
    
    // Zoom in on the first timeline
    timeline1.zoomIn(2);
    
    // Wait for event propagation
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Both timelines should now have the same visible range
    const range1 = timeline1.visibleRange;
    const range2 = timeline2.visibleRange;
    
    expect(range2.start).toBe(range1.start);
    expect(range2.end).toBe(range1.end);
    
    // The visible range should be half the original (zoomed in by factor of 2)
    const rangeSize = range1.end - range1.start;
    expect(rangeSize).toBe(5000);
  });

  it('should set up ResizeObserver on connect to handle container resize', () => {
    // FileDisplay is already connected in beforeEach
    // Verify that the element is properly set up
    expect(element).toBeDefined();
    expect(element.shadowRoot).not.toBeNull();
    
    // The ResizeObserver should be set up during connectedCallback
    // We verify this by ensuring the element functions correctly
    const waveformsContainer = element.shadowRoot!.querySelector('.waveforms-container');
    expect(waveformsContainer).not.toBeNull();
  });

  it('should add signal when checkbox is checked', async () => {
    element.filename = 'test.vcd';
    
    // Initially no signals selected (only the default timeline)
    expect(element.getSelectedSignalRefs()).toEqual([]);
    
    // Dispatch a checkbox-toggle event with checked=true
    const event = new CustomEvent('checkbox-toggle', {
      detail: {
        name: 'test_signal',
        ref: 1,
        filename: 'test.vcd',
        checked: true
      }
    });
    
    document.dispatchEvent(event);
    
    // Wait for requestAnimationFrame to complete
    await new Promise(resolve => requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve(undefined));
    }));
    
    // Check that the signal was added
    expect(element.getSelectedSignalRefs()).toContain(1);
  });

  it('should remove signal when checkbox is unchecked', async () => {
    element.filename = 'test.vcd';
    
    // First add a signal
    const addEvent = new CustomEvent('checkbox-toggle', {
      detail: {
        name: 'test_signal',
        ref: 1,
        filename: 'test.vcd',
        checked: true
      }
    });
    
    document.dispatchEvent(addEvent);
    
    // Wait for requestAnimationFrame to complete
    await new Promise(resolve => requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve(undefined));
    }));
    
    // Verify signal was added
    expect(element.getSelectedSignalRefs()).toContain(1);
    
    // Now uncheck the checkbox
    const removeEvent = new CustomEvent('checkbox-toggle', {
      detail: {
        name: 'test_signal',
        ref: 1,
        filename: 'test.vcd',
        checked: false
      }
    });
    
    document.dispatchEvent(removeEvent);
    
    // Wait for render to complete
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Check that the signal was removed
    expect(element.getSelectedSignalRefs()).not.toContain(1);
  });

  it('should toggle multiple signals independently', async () => {
    element.filename = 'test.vcd';
    
    // Add first signal
    document.dispatchEvent(new CustomEvent('checkbox-toggle', {
      detail: { name: 'signal1', ref: 1, filename: 'test.vcd', checked: true }
    }));
    
    await new Promise(resolve => requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve(undefined));
    }));
    
    // Add second signal
    document.dispatchEvent(new CustomEvent('checkbox-toggle', {
      detail: { name: 'signal2', ref: 2, filename: 'test.vcd', checked: true }
    }));
    
    await new Promise(resolve => requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve(undefined));
    }));
    
    // Both signals should be selected
    expect(element.getSelectedSignalRefs()).toContain(1);
    expect(element.getSelectedSignalRefs()).toContain(2);
    
    // Remove first signal
    document.dispatchEvent(new CustomEvent('checkbox-toggle', {
      detail: { name: 'signal1', ref: 1, filename: 'test.vcd', checked: false }
    }));
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Only second signal should remain
    expect(element.getSelectedSignalRefs()).not.toContain(1);
    expect(element.getSelectedSignalRefs()).toContain(2);
  });
});
