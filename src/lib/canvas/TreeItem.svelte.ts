import type { SwellState } from '$lib/data/SwellState.svelte';
import { isPaintable, type ChangesGenerator, type Painter } from './interfaces';



export interface TreeItemParams {
  name: string;
  children?: TreeItem[];
  state: SwellState;
  painter: Painter;
  changes?: ChangesGenerator;
}

export class TreeItem {
  selected = $state(false);
  children: TreeItem[] = $state([]);
  expanded = $state(true);
  name = $state('');

  state: SwellState;
  ctx: CanvasRenderingContext2D | undefined;
  painter: Painter;
  changes?: ChangesGenerator;

  constructor({ name, children = [], state, painter, changes }: TreeItemParams) {
    this.name = name;
    this.children = children;
    this.state = state;
    this.painter = painter;
    this.changes = changes;
  }

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
    const pixelHeight = this.state.temp.signalsCanvas.pixelHeight;
    const pixelWidth = this.state.temp.signalsCanvas.pixelWidth;
    for (const node of this.iterate()) {
      if (isPaintable(node) && node.ctx) {
        node.ctx.canvas.height = pixelHeight;
        node.ctx.canvas.width = pixelWidth;
        node.paint({ ctx: node.ctx, changes: node.changes, state: this.state });
      }
    }
  };

  toggleSelected = () => {
    this.selected = !this.selected;
  };
}
