import { config } from '$lib/data/config.svelte';
import { signalCanvas } from '$lib/data/signalCanvas.svelte';
import { TreeItem } from './TreeItem.svelte';

export class StyledTreeItem extends TreeItem {
  static baseColors = ['red', 'green', 'blue', 'yellow', 'purple', 'orange', 'cyan', 'magenta'];

  static #itemCount = 0;

  #color = StyledTreeItem.baseColors[StyledTreeItem.#itemCount++ % StyledTreeItem.baseColors.length];

  get color() {
    return this.#color;
  }

  set color(v) {
    signalCanvas.dirty = true;
    this.#color = v;
  }

  setStyle = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = this.color;
    ctx.lineWidth = config.lineWidth;
  };
}
