import { describe, it, expect, beforeEach, vi } from 'vitest';
import './file-display.js';
import { FileDisplay } from './file-display.js';

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
    const consoleSpy = vi.spyOn(console, 'error');
    
    // Test negative values
    await element.setVisibleRange(-100, 1000);
    expect(consoleSpy).toHaveBeenCalledWith('Invalid time range: values must be non-negative');
    
    // Test start >= end
    await element.setVisibleRange(1000, 1000);
    expect(consoleSpy).toHaveBeenCalledWith('Invalid time range: start must be less than end');
    
    await element.setVisibleRange(2000, 1000);
    expect(consoleSpy).toHaveBeenCalledWith('Invalid time range: start must be less than end');
    
    consoleSpy.mockRestore();
  });

  it('should render without errors', () => {
    element.filename = 'test.vcd';
    expect(element.filename).toBe('test.vcd');
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
    
    // Check that canvases were created
    const shadowRoot = element.shadowRoot;
    expect(shadowRoot).toBeTruthy();
    
    const canvases = shadowRoot?.querySelectorAll('canvas');
    expect(canvases).toBeTruthy();
    expect(canvases?.length).toBeGreaterThanOrEqual(2); // Timeline + signal canvas
    
    // Signal canvas should have dimensions set (not the timeline canvas)
    const signalCanvas = canvases?.[1]; // Second canvas is the signal
    if (signalCanvas) {
      expect(signalCanvas.height).toBe(100);
      // Width should be set (either to clientWidth or fallback to 800)
      expect(signalCanvas.width).toBeGreaterThan(0);
    }
  });
});
