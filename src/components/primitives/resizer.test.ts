import { describe, it, expect, beforeEach, vi } from 'vitest';
import './resizer.js';
import { Resizer } from './resizer.js';

describe('Resizer Component', () => {
  let element: Resizer;

  beforeEach(() => {
    element = document.createElement('app-resizer') as Resizer;
    document.body.appendChild(element);
  });

  it('should create resizer element', () => {
    expect(element).toBeInstanceOf(Resizer);
    expect(element.shadowRoot).toBeTruthy();
  });

  it('should have default horizontal direction', () => {
    expect(element.direction).toBe('horizontal');
  });

  it('should set direction attribute', () => {
    element.direction = 'vertical';
    expect(element.getAttribute('direction')).toBe('vertical');
    expect(element.direction).toBe('vertical');
  });

  it('should emit resize-start event on mousedown', () => {
    const spy = vi.fn();
    element.addEventListener('resize-start', spy);
    
    const mousedownEvent = new MouseEvent('mousedown', { 
      clientX: 100, 
      clientY: 50,
      bubbles: true 
    });
    element.dispatchEvent(mousedownEvent);
    
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0].detail.startPos).toBe(100); // horizontal default
  });

  it('should emit resize-move event during drag', () => {
    const moveSpy = vi.fn();
    element.addEventListener('resize-move', moveSpy);
    
    // Start drag
    const mousedownEvent = new MouseEvent('mousedown', { 
      clientX: 100,
      bubbles: true 
    });
    element.dispatchEvent(mousedownEvent);
    
    // Move mouse
    const mousemoveEvent = new MouseEvent('mousemove', { 
      clientX: 150,
      bubbles: true 
    });
    window.dispatchEvent(mousemoveEvent);
    
    expect(moveSpy).toHaveBeenCalled();
    expect(moveSpy.mock.calls[0][0].detail.delta).toBe(50);
  });

  it('should emit resize-end event on mouseup', () => {
    const endSpy = vi.fn();
    element.addEventListener('resize-end', endSpy);
    
    // Start drag
    const mousedownEvent = new MouseEvent('mousedown', { 
      clientX: 100,
      bubbles: true 
    });
    element.dispatchEvent(mousedownEvent);
    
    // End drag
    const mouseupEvent = new MouseEvent('mouseup', { 
      clientX: 120,
      bubbles: true 
    });
    window.dispatchEvent(mouseupEvent);
    
    expect(endSpy).toHaveBeenCalled();
    expect(endSpy.mock.calls[0][0].detail.totalDelta).toBe(20);
  });

  it('should use vertical direction for clientY', () => {
    element.direction = 'vertical';
    const spy = vi.fn();
    element.addEventListener('resize-start', spy);
    
    const mousedownEvent = new MouseEvent('mousedown', { 
      clientX: 100, 
      clientY: 200,
      bubbles: true 
    });
    element.dispatchEvent(mousedownEvent);
    
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0].detail.startPos).toBe(200); // should use clientY
  });
});
