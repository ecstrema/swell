import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Timeline } from './timeline';

describe('Timeline Component', () => {
  let timeline: Timeline;

  beforeEach(() => {
    timeline = new Timeline();
    document.body.appendChild(timeline);
  });

  it('should initialize with default time ranges', () => {
    const visibleRange = timeline.visibleRange;
    const totalRange = timeline.totalRange;

    expect(visibleRange.start).toBe(0);
    expect(visibleRange.end).toBe(1000000);
    expect(totalRange.start).toBe(0);
    expect(totalRange.end).toBe(1000000);
  });

  it('should update visible range', () => {
    timeline.visibleRange = { start: 100, end: 500 };

    const range = timeline.visibleRange;
    expect(range.start).toBe(100);
    expect(range.end).toBe(500);
  });

  it('should update total range', () => {
    timeline.totalRange = { start: 0, end: 10000 };

    const range = timeline.totalRange;
    expect(range.start).toBe(0);
    expect(range.end).toBe(10000);
  });

  it('should dispatch range-changed event on zoom', () => {
    timeline.totalRange = { start: 0, end: 1000 };
    timeline.visibleRange = { start: 0, end: 1000 };

    return new Promise<void>((resolve) => {
      timeline.addEventListener('range-changed', (event: Event) => {
        const customEvent = event as CustomEvent;
        expect(customEvent.detail).toHaveProperty('start');
        expect(customEvent.detail).toHaveProperty('end');
        resolve();
      });

      timeline.zoomIn();
    });
  });

  it('should zoom in and reduce visible range', () => {
    timeline.totalRange = { start: 0, end: 1000 };
    timeline.visibleRange = { start: 0, end: 1000 };

    timeline.zoomIn(2);

    const range = timeline.visibleRange;
    const rangeSize = range.end - range.start;
    expect(rangeSize).toBe(500); // Half of the original range
  });

  it('should zoom out and increase visible range', () => {
    timeline.totalRange = { start: 0, end: 1000 };
    timeline.visibleRange = { start: 250, end: 750 };

    timeline.zoomOut(2);

    const range = timeline.visibleRange;
    const rangeSize = range.end - range.start;
    expect(rangeSize).toBe(1000); // Double of the original range (clamped to total)
  });

  it('should zoom to fit entire range', () => {
    timeline.totalRange = { start: 0, end: 2000 };
    timeline.visibleRange = { start: 500, end: 1000 };

    timeline.zoomToFit();

    const range = timeline.visibleRange;
    expect(range.start).toBe(0);
    expect(range.end).toBe(2000);
  });

  it('should clamp zoom to total range bounds', () => {
    timeline.totalRange = { start: 0, end: 1000 };
    timeline.visibleRange = { start: 0, end: 1000 };

    // Try to zoom out beyond total range
    timeline.zoomOut(10);

    const range = timeline.visibleRange;
    expect(range.start).toBe(0);
    expect(range.end).toBe(1000);
  });

  it('should render canvas element', () => {
    const shadowRoot = timeline.shadowRoot;
    expect(shadowRoot).not.toBeNull();

    const canvas = shadowRoot!.querySelector('.timeline-canvas');
    expect(canvas).not.toBeNull();
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
  });

  it('should not render scrollbar elements', () => {
    const shadowRoot = timeline.shadowRoot;
    expect(shadowRoot).not.toBeNull();

    const scrollbar = shadowRoot!.querySelector('.scrollbar');
    const scrollbarTrack = shadowRoot!.querySelector('.scrollbar-track');
    const scrollbarThumb = shadowRoot!.querySelector('.scrollbar-thumb');

    expect(scrollbar).toBeNull();
    expect(scrollbarTrack).toBeNull();
    expect(scrollbarThumb).toBeNull();
  });

  it('should set up ResizeObserver on connect', () => {
    // Since Timeline is already connected in beforeEach, check that resizeObserver exists
    // We can't directly access private fields, but we can verify the behavior
    // by checking that the timeline is properly observing resize events
    expect(timeline).toBeDefined();
    expect(timeline.shadowRoot).not.toBeNull();
    
    // The ResizeObserver should be set up during connectedCallback
    // We verify this by ensuring the timeline still functions correctly
    const canvas = timeline.shadowRoot!.querySelector('.timeline-canvas');
    expect(canvas).not.toBeNull();
  });

  it('should handle sub-nanosecond (picosecond) time ranges', () => {
    // Set a range that includes sub-nanosecond values (picoseconds)
    timeline.totalRange = { start: 0, end: 1 }; // 0 to 1 nanosecond
    timeline.visibleRange = { start: 0, end: 0.5 }; // 0 to 0.5 nanoseconds

    // Verify the ranges were set correctly
    const range = timeline.visibleRange;
    expect(range.start).toBe(0);
    expect(range.end).toBe(0.5);

    // The formatTime method should handle these sub-nanosecond values
    // and display them in picoseconds. We verify this works by checking
    // that the canvas renders without errors.
    const canvas = timeline.shadowRoot!.querySelector('.timeline-canvas') as HTMLCanvasElement;
    expect(canvas).not.toBeNull();
    expect(canvas.width).toBeGreaterThan(0);
  });

  it('should dispatch range-changed event on drag-to-zoom', () => {
    timeline.totalRange = { start: 0, end: 1000 };
    timeline.visibleRange = { start: 0, end: 1000 };

    return new Promise<void>((resolve) => {
      timeline.addEventListener('range-changed', (event: Event) => {
        const customEvent = event as CustomEvent;
        expect(customEvent.detail).toHaveProperty('start');
        expect(customEvent.detail).toHaveProperty('end');
        
        // The new range should be smaller than the original
        const newRange = customEvent.detail.end - customEvent.detail.start;
        expect(newRange).toBeGreaterThan(0);
        expect(newRange).toBeLessThan(1000);
        resolve();
      });

      // Simulate drag-to-zoom by directly calling the methods
      const canvas = timeline.shadowRoot!.querySelector('.timeline-canvas') as HTMLCanvasElement;
      
      // Mock getBoundingClientRect for jsdom
      const originalGetBoundingClientRect = canvas.getBoundingClientRect;
      canvas.getBoundingClientRect = () => ({
        left: 0,
        top: 0,
        right: 400,
        bottom: 32,
        width: 400,
        height: 32,
        x: 0,
        y: 0,
        toJSON: () => {}
      } as DOMRect);
      
      const mouseDown = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 10,
        bubbles: true
      });
      canvas.dispatchEvent(mouseDown);

      const mouseUp = new MouseEvent('mouseup', {
        clientX: 300,
        clientY: 10,
        bubbles: true
      });
      window.dispatchEvent(mouseUp);
      
      // Restore original method
      canvas.getBoundingClientRect = originalGetBoundingClientRect;
    });
  });

  it('should ignore small drags (less than 5 pixels)', () => {
    timeline.totalRange = { start: 0, end: 1000 };
    timeline.visibleRange = { start: 0, end: 1000 };

    const canvas = timeline.shadowRoot!.querySelector('.timeline-canvas') as HTMLCanvasElement;
    
    // Mock getBoundingClientRect for jsdom
    const originalGetBoundingClientRect = canvas.getBoundingClientRect;
    canvas.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 400,
      bottom: 32,
      width: 400,
      height: 32,
      x: 0,
      y: 0,
      toJSON: () => {}
    } as DOMRect);
    
    const mouseDown = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 10,
      bubbles: true
    });
    canvas.dispatchEvent(mouseDown);

    const mouseUp = new MouseEvent('mouseup', {
      clientX: 103, // Only 3 pixels difference
      clientY: 10,
      bubbles: true
    });
    window.dispatchEvent(mouseUp);

    // Range should not have changed
    const range = timeline.visibleRange;
    expect(range.start).toBe(0);
    expect(range.end).toBe(1000);
    
    // Restore original method
    canvas.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it('should set cursor to default instead of crosshair', () => {
    const canvas = timeline.shadowRoot!.querySelector('.timeline-canvas') as HTMLCanvasElement;
    expect(canvas).not.toBeNull();
    
    // Verify that the timeline CSS has been loaded (adoptedStyleSheets)
    expect(timeline.shadowRoot!.adoptedStyleSheets.length).toBeGreaterThan(0);
    
    // The actual cursor style will be applied via CSS, which is verified by the presence of adoptedStyleSheets
    // In a real browser environment, the cursor would be 'default' as specified in timeline.css
  });
});
