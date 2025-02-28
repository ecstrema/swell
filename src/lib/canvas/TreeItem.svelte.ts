import { signalCanvas } from '$lib/data/Canvas.svelte';
import { isPaintable } from './interfaces';

export class TreeItem {
  // TODO: any way to move this out of svelte's reactivity system?
  selected = $state(false);
  children: TreeItem[] = $state([]);
  expanded = $state(true);

  hasChildren = () => {
    return this.children.length > 0;
  };

  *iterate(): Generator<TreeItem> {
    yield this;
    for (const child of this.children) {
      yield* child.iterate();
    }
  }

  paintWithChildren = () => {
    for (const node of this.iterate()) {
      if (isPaintable(node) && node.ctx) {
        node.ctx.canvas.height = signalCanvas.pixelHeight;
        node.ctx.canvas.width = signalCanvas.pixelWidth;
        node.paint();
      }
    }
  };

  constructor(
    public name: string,
    children: TreeItem[] = [],
  ) {
    this.children = children;
  }

  toggleSelected = () => {
    this.selected = !this.selected;
  };
}
