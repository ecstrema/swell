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

  it('should render zoom control buttons', () => {
    const shadowRoot = timeline.shadowRoot;
    expect(shadowRoot).not.toBeNull();

    const zoomInBtn = shadowRoot!.querySelector('#zoom-in-btn');
    const zoomOutBtn = shadowRoot!.querySelector('#zoom-out-btn');
    const zoomFitBtn = shadowRoot!.querySelector('#zoom-fit-btn');

    expect(zoomInBtn).not.toBeNull();
    expect(zoomOutBtn).not.toBeNull();
    expect(zoomFitBtn).not.toBeNull();
  });

  it('should render canvas element', () => {
    const shadowRoot = timeline.shadowRoot;
    expect(shadowRoot).not.toBeNull();

    const canvas = shadowRoot!.querySelector('.timeline-canvas');
    expect(canvas).not.toBeNull();
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
  });

  it('should render scrollbar elements', () => {
    const shadowRoot = timeline.shadowRoot;
    expect(shadowRoot).not.toBeNull();

    const scrollbar = shadowRoot!.querySelector('.scrollbar');
    const scrollbarTrack = shadowRoot!.querySelector('.scrollbar-track');
    const scrollbarThumb = shadowRoot!.querySelector('.scrollbar-thumb');

    expect(scrollbar).not.toBeNull();
    expect(scrollbarTrack).not.toBeNull();
    expect(scrollbarThumb).not.toBeNull();
  });
});
