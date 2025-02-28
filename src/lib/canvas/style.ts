import type { SwellState } from '$lib/data/SwellState.svelte';

export const applyBaseStyle = (ctx: CanvasRenderingContext2D, state: SwellState) => {
  ctx.lineWidth = state.settings.lineWidth;
  ctx.font = `${state.settings.fontSize}px monospace`;
  ctx.textAlign = 'center';

  const foregroundHSL = window.getComputedStyle(ctx.canvas).getPropertyValue('--foreground');
  const foreground = `hsl(${foregroundHSL})`;
  ctx.fillStyle = foreground;
}

// export class StyledTreeItem extends TreeItem {
//   static baseColors = ['red', 'green', 'blue', 'yellow', 'purple', 'orange', 'cyan', 'magenta'];
//   static #itemCount = 0;

//   color = StyledTreeItem.baseColors[StyledTreeItem.#itemCount++ % StyledTreeItem.baseColors.length];

//   setStyle = (ctx: CanvasRenderingContext2D) => {
//     ctx.strokeStyle = this.color;
//     ctx.lineWidth = swellState.settings.lineWidth;
//   };
// }
