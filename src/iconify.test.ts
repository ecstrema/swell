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

  it('should be able to import icons as SVG strings', async () => {
    // Icons are imported at build time as strings
    const { default: HomeIcon } = await import('~icons/mdi/home?raw');
    
    expect(typeof HomeIcon).toBe('string');
    expect(HomeIcon).toContain('<svg');
    expect(HomeIcon).toContain('</svg>');
    
    // Verify SVG has expected attributes
    expect(HomeIcon).toMatch(/viewBox="[^"]+"/);
    
    // Verify it contains path/shape data (actual icon content)
    expect(HomeIcon).toMatch(/<path|<circle|<rect|<polygon/);
  });

  it('should allow using icons as innerHTML', async () => {
    const { default: HeartIcon } = await import('~icons/mdi/heart?raw');
    
    const span = document.createElement('span');
    span.innerHTML = HeartIcon;
    container.appendChild(span);

    const svg = span.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.tagName.toLowerCase()).toBe('svg');
  });

  it('should allow styling icons with CSS', async () => {
    const { default: CheckIcon } = await import('~icons/mdi/check-circle?raw');
    
    const wrapper = document.createElement('span');
    wrapper.innerHTML = CheckIcon;
    container.appendChild(wrapper);

    const svg = wrapper.querySelector('svg');
    if (svg) {
      svg.style.color = 'green';
      svg.style.width = '32px';
      svg.style.height = '32px';
    }

    expect(svg?.style.color).toBe('green');
    expect(svg?.style.width).toBe('32px');
    expect(svg?.style.height).toBe('32px');
  });

  it('should support multiple icon sets', async () => {
    const icons = await Promise.all([
      import('~icons/mdi/home?raw'),
      import('~icons/fa-solid/user?raw'),
      import('~icons/bi/heart?raw'),
      import('~icons/lucide/settings?raw')
    ]);

    icons.forEach(({ default: iconSvg }) => {
      const span = document.createElement('span');
      span.innerHTML = iconSvg;
      container.appendChild(span);

      const svg = span.querySelector('svg');
      expect(svg).not.toBeNull();
    });

    expect(container.children.length).toBe(icons.length);
  });

  it('should work in button elements', async () => {
    const { default: PlusIcon } = await import('~icons/mdi/plus?raw');
    
    const button = document.createElement('button');
    button.innerHTML = `${PlusIcon} <span>Add Item</span>`;
    container.appendChild(button);

    const svg = button.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(button.textContent).toContain('Add Item');
  });

  it('should allow creating icons programmatically', async () => {
    const { default: SettingsIcon } = await import('~icons/mdi/settings?raw');
    
    // Simulate creating an icon utility
    const createIcon = (iconSvg: string, color: string, size: string): HTMLElement => {
      const wrapper = document.createElement('span');
      wrapper.innerHTML = iconSvg;
      
      const svg = wrapper.querySelector('svg');
      if (svg) {
        svg.style.color = color;
        svg.style.width = size;
        svg.style.height = size;
      }
      
      return wrapper;
    };

    const icon = createIcon(SettingsIcon, 'blue', '24px');
    container.appendChild(icon);

    const svg = icon.querySelector('svg');
    expect(svg?.style.color).toBe('blue');
    expect(svg?.style.width).toBe('24px');
    expect(svg?.style.height).toBe('24px');
  });
});
