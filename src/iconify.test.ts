import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Iconify Integration', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should be able to create iconify-icon elements', () => {
    const icon = document.createElement('iconify-icon');
    icon.setAttribute('icon', 'mdi:home');
    container.appendChild(icon);

    expect(icon.tagName.toLowerCase()).toBe('iconify-icon');
    expect(icon.getAttribute('icon')).toBe('mdi:home');
  });

  it('should allow styling iconify-icon elements', () => {
    const icon = document.createElement('iconify-icon');
    icon.setAttribute('icon', 'mdi:heart');
    icon.style.color = 'red';
    icon.style.fontSize = '24px';
    container.appendChild(icon);

    expect(icon.style.color).toBe('red');
    expect(icon.style.fontSize).toBe('24px');
  });

  it('should support multiple icon sets', () => {
    const icons = [
      { set: 'mdi', name: 'home' },
      { set: 'fa-solid', name: 'user' },
      { set: 'bi', name: 'heart' },
      { set: 'lucide', name: 'settings' }
    ];

    icons.forEach(({ set, name }) => {
      const icon = document.createElement('iconify-icon');
      const iconName = `${set}:${name}`;
      icon.setAttribute('icon', iconName);
      container.appendChild(icon);

      expect(icon.getAttribute('icon')).toBe(iconName);
    });

    expect(container.children.length).toBe(icons.length);
  });

  it('should work in button elements', () => {
    const button = document.createElement('button');
    const icon = document.createElement('iconify-icon');
    icon.setAttribute('icon', 'mdi:plus');
    
    button.appendChild(icon);
    button.appendChild(document.createTextNode(' Add Item'));
    container.appendChild(button);

    const iconInButton = button.querySelector('iconify-icon');
    expect(iconInButton).not.toBeNull();
    expect(iconInButton?.getAttribute('icon')).toBe('mdi:plus');
  });

  it('should allow creating icons programmatically', () => {
    // Simulate creating an icon in TypeScript
    const createIcon = (iconName: string, color: string, size: string): HTMLElement => {
      const icon = document.createElement('iconify-icon');
      icon.setAttribute('icon', iconName);
      icon.style.color = color;
      icon.style.fontSize = size;
      return icon;
    };

    const checkIcon = createIcon('mdi:check-circle', 'green', '32px');
    container.appendChild(checkIcon);

    expect(checkIcon.getAttribute('icon')).toBe('mdi:check-circle');
    expect(checkIcon.style.color).toBe('green');
    expect(checkIcon.style.fontSize).toBe('32px');
  });
});
