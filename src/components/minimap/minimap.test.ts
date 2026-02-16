import { describe, it, expect, beforeEach } from 'vitest';
import { Minimap } from './minimap';

describe('Minimap Component', () => {
  let minimap: Minimap;

  beforeEach(() => {
    minimap = new Minimap();
    document.body.appendChild(minimap);
  });

  it('should render scrollbar elements', () => {
    const shadowRoot = minimap.shadowRoot;
    expect(shadowRoot).not.toBeNull();

    const scrollbar = shadowRoot!.querySelector('.scrollbar');
    const scrollbarTrack = shadowRoot!.querySelector('.scrollbar-track');
    const scrollbarThumb = shadowRoot!.querySelector('.scrollbar-thumb');

    expect(scrollbar).not.toBeNull();
    expect(scrollbarTrack).not.toBeNull();
    expect(scrollbarThumb).not.toBeNull();
  });
});
