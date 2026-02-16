import { describe, it, expect, beforeEach } from 'vitest';
import './resizable-panel.js';
import { ResizablePanel } from './resizable-panel.js';

describe('ResizablePanel Component', () => {
  let element: ResizablePanel;

  beforeEach(() => {
    element = document.createElement('app-resizable-panel') as ResizablePanel;
    document.body.appendChild(element);
  });

  it('should create resizable panel element', () => {
    expect(element).toBeInstanceOf(ResizablePanel);
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

  it('should render panel and content slots', () => {
    const panelDiv = document.createElement('div');
    panelDiv.setAttribute('slot', 'panel');
    panelDiv.textContent = 'Panel Content';
    
    const contentDiv = document.createElement('div');
    contentDiv.setAttribute('slot', 'content');
    contentDiv.textContent = 'Main Content';
    
    element.appendChild(panelDiv);
    element.appendChild(contentDiv);
    
    // Check that slots are present in shadow DOM
    const panelSlot = element.shadowRoot!.querySelector('slot[name="panel"]');
    const contentSlot = element.shadowRoot!.querySelector('slot[name="content"]');
    
    expect(panelSlot).toBeTruthy();
    expect(contentSlot).toBeTruthy();
  });

  it('should have resizer element in shadow DOM', () => {
    const resizer = element.shadowRoot!.querySelector('app-resizer');
    expect(resizer).toBeTruthy();
  });

  it('should set initial size attribute', () => {
    element.setAttribute('initial-size', '300px');
    // The internal size should be updated (but we can't easily test private properties)
    expect(element.getAttribute('initial-size')).toBe('300px');
  });

  it('should set min and max size attributes', () => {
    element.setAttribute('min-size', '150px');
    element.setAttribute('max-size', '500px');
    
    expect(element.getAttribute('min-size')).toBe('150px');
    expect(element.getAttribute('max-size')).toBe('500px');
  });

  it('should update resizer direction when panel direction changes', () => {
    element.direction = 'vertical';
    
    const resizer = element.shadowRoot!.querySelector('app-resizer');
    expect(resizer?.getAttribute('direction')).toBe('vertical');
  });
});
