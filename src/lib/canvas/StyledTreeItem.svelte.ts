import { config } from "$lib/data/config.svelte";
import { TreeItem } from "./TreeItem.svelte";

export class StyledTreeItem extends TreeItem {
  static baseColors = [
    "red",
    "green",
    "blue",
    "yellow",
    "purple",
    "orange",
    "cyan",
    "magenta",
  ];

  static #itemCount = 0;

  color = $state(
    StyledTreeItem.baseColors[
      StyledTreeItem.#itemCount++ % StyledTreeItem.baseColors.length
    ]
  );

  setStyle = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = this.color;
    ctx.lineWidth = config.lineWidth;
  };
}
