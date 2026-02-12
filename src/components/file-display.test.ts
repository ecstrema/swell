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

  it('should update visible range when setVisibleRange is called', () => {
    element.setVisibleRange(1000, 5000);
    const range = element.getVisibleRange();
    expect(range.start).toBe(1000);
    expect(range.end).toBe(5000);
  });

  it('should allow setting custom visible ranges', () => {
    // Test with different ranges
    element.setVisibleRange(0, 100);
    let range = element.getVisibleRange();
    expect(range.start).toBe(0);
    expect(range.end).toBe(100);

    element.setVisibleRange(500, 1500);
    range = element.getVisibleRange();
    expect(range.start).toBe(500);
    expect(range.end).toBe(1500);
  });

  it('should render without errors', () => {
    element.filename = 'test.vcd';
    expect(element.filename).toBe('test.vcd');
  });
});
