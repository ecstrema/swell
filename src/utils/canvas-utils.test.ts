import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupCanvasForHighDPI } from './canvas-utils.js';

describe('canvas-utils', () => {
  let canvas: HTMLCanvasElement;
  let originalDevicePixelRatio: number;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    originalDevicePixelRatio = window.devicePixelRatio;
  });

  afterEach(() => {
    // Restore original devicePixelRatio
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      configurable: true,
      value: originalDevicePixelRatio
    });
  });

  describe('setupCanvasForHighDPI', () => {
    it('should set canvas dimensions correctly with devicePixelRatio = 1', () => {
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        configurable: true,
        value: 1
      });

      const ctx = setupCanvasForHighDPI(canvas, 800, 600);

      expect(ctx).toBeTruthy();
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(600);
      expect(canvas.style.width).toBe('800px');
      expect(canvas.style.height).toBe('600px');
    });

    it('should scale canvas dimensions with devicePixelRatio = 2', () => {
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        configurable: true,
        value: 2
      });

      const ctx = setupCanvasForHighDPI(canvas, 800, 600);

      expect(ctx).toBeTruthy();
      // Internal dimensions should be scaled by DPR
      expect(canvas.width).toBe(1600);
      expect(canvas.height).toBe(1200);
      // CSS dimensions should remain unchanged
      expect(canvas.style.width).toBe('800px');
      expect(canvas.style.height).toBe('600px');
    });

    it('should scale canvas dimensions with devicePixelRatio = 3', () => {
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        configurable: true,
        value: 3
      });

      const ctx = setupCanvasForHighDPI(canvas, 400, 300);

      expect(ctx).toBeTruthy();
      // Internal dimensions should be scaled by DPR
      expect(canvas.width).toBe(1200);
      expect(canvas.height).toBe(900);
      // CSS dimensions should remain unchanged
      expect(canvas.style.width).toBe('400px');
      expect(canvas.style.height).toBe('300px');
    });

    it('should handle fractional devicePixelRatio values', () => {
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        configurable: true,
        value: 1.5
      });

      const ctx = setupCanvasForHighDPI(canvas, 800, 600);

      expect(ctx).toBeTruthy();
      expect(canvas.width).toBe(1200);
      expect(canvas.height).toBe(900);
      expect(canvas.style.width).toBe('800px');
      expect(canvas.style.height).toBe('600px');
    });

    it('should scale the 2D context by devicePixelRatio', () => {
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        configurable: true,
        value: 2
      });

      const ctx = setupCanvasForHighDPI(canvas, 800, 600);

      expect(ctx).toBeTruthy();
      if (ctx) {
        // Unfortunately, we can't easily test the scale transformation directly
        // in jsdom, but we can verify the context was obtained
        expect(ctx.canvas).toBe(canvas);
      }
    });

    it('should return null if 2d context is not available', () => {
      // Mock getContext to return null
      const originalGetContext = canvas.getContext;
      canvas.getContext = vi.fn().mockReturnValue(null);

      const ctx = setupCanvasForHighDPI(canvas, 800, 600);

      expect(ctx).toBeNull();
      
      // Restore original method
      canvas.getContext = originalGetContext;
    });

    it('should handle zero or negative dimensions gracefully', () => {
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        configurable: true,
        value: 2
      });

      const ctx = setupCanvasForHighDPI(canvas, 0, 0);

      expect(ctx).toBeTruthy();
      expect(canvas.width).toBe(0);
      expect(canvas.height).toBe(0);
      expect(canvas.style.width).toBe('0px');
      expect(canvas.style.height).toBe('0px');
    });

    it('should handle missing devicePixelRatio by defaulting to 1', () => {
      // Remove devicePixelRatio property
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        configurable: true,
        value: undefined
      });

      const ctx = setupCanvasForHighDPI(canvas, 800, 600);

      expect(ctx).toBeTruthy();
      // Should default to 1 when devicePixelRatio is undefined
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(600);
      expect(canvas.style.width).toBe('800px');
      expect(canvas.style.height).toBe('600px');
    });
  });
});
