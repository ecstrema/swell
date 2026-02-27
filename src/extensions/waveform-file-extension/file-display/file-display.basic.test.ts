import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import '../file-display/file-display.js';
import { FileDisplay } from '../file-display/file-display.js';
import { SettingsExtension } from '../../settings-extension/settings-extension.js';

// minimal backend mocks used by FileDisplay
vi.mock('../../../backend/index.js', () => ({
  getSignalChanges: vi.fn(async () => []),
  getHierarchy: vi.fn(async () => ({ name: 'top', var_ref: 0, children: [] })),
  isTauri: false
}));

describe('FileDisplay (basic)', () => {
  let element: FileDisplay;

  beforeEach(() => {
    const settings = new SettingsExtension(new Map());
    element = new FileDisplay(settings);
    document.body.appendChild(element);
    // wait one tick for connectedCallback
  });

  afterEach(() => {
    element.remove();
  });

  it('has default visible range and no signals', () => {
    const range = element.getVisibleRange();
    expect(range).toEqual({ start: 0, end: 1000000 });
    expect(element.getSelectedSignalRefs()).toEqual([]);
  });

  it('responds to signal-select events', async () => {
    element.filename = 'a.vcd';
    document.dispatchEvent(new CustomEvent('signal-select', {
      detail: { name: 'foo', ref: 1, filename: 'a.vcd' }
    }));
    // wait for rAF cycle
    await new Promise(r => requestAnimationFrame(r));
    expect(element.getSelectedSignalRefs()).toContain(1);
  });

  it('updates visible range and throws on bad ranges', async () => {
    await element.setVisibleRange(10, 20);
    expect(element.getVisibleRange()).toEqual({ start: 10, end: 20 });

    await expect(element.setVisibleRange(-1, 10)).rejects.toThrow();
    await expect(element.setVisibleRange(10, 10)).rejects.toThrow();
  });
});
