import { describe, it, expect, beforeEach, vi } from 'vitest';
import './split-button.js';
import { SplitButton } from './split-button.js';

describe('SplitButton Component', () => {
  let element: SplitButton;

  beforeEach(() => {
    element = document.createElement('app-split-button') as SplitButton;
    document.body.appendChild(element);
  });

  it('should create split button element', () => {
    expect(element).toBeInstanceOf(SplitButton);
    expect(element.shadowRoot).toBeTruthy();
  });

  it('should have default labels', () => {
    expect(element.leftLabel).toBe('Left');
    expect(element.rightLabel).toBe('Right');
  });

  it('should set custom labels via attributes', () => {
    element.setAttribute('left-label', '+ Add Timeline');
    element.setAttribute('right-label', '+ Add Minimap');
    expect(element.leftLabel).toBe('+ Add Timeline');
    expect(element.rightLabel).toBe('+ Add Minimap');
  });

  it('should set custom labels via properties', () => {
    element.leftLabel = 'Custom Left';
    element.rightLabel = 'Custom Right';
    expect(element.getAttribute('left-label')).toBe('Custom Left');
    expect(element.getAttribute('right-label')).toBe('Custom Right');
  });

  it('should emit left-click event when left button is clicked', () => {
    const spy = vi.fn();
    element.addEventListener('left-click', spy);
    
    const leftButton = element.shadowRoot!.querySelector('.split-button-left') as HTMLButtonElement;
    leftButton.click();
    
    expect(spy).toHaveBeenCalled();
  });

  it('should emit right-click event when right button is clicked', () => {
    const spy = vi.fn();
    element.addEventListener('right-click', spy);
    
    const rightButton = element.shadowRoot!.querySelector('.split-button-right') as HTMLButtonElement;
    rightButton.click();
    
    expect(spy).toHaveBeenCalled();
  });

  it('should render both buttons with correct labels', () => {
    element.leftLabel = 'Action 1';
    element.rightLabel = 'Action 2';
    
    const leftButton = element.shadowRoot!.querySelector('.split-button-left') as HTMLButtonElement;
    const rightButton = element.shadowRoot!.querySelector('.split-button-right') as HTMLButtonElement;
    
    expect(leftButton.textContent).toBe('Action 1');
    expect(rightButton.textContent).toBe('Action 2');
  });
});
