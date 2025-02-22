import { pairGenerator, printGenerator } from "$lib/generators";
import { config } from "$lib/data/config.svelte";
import type { ValueChange } from "$lib/data/signals.svelte";
import { TreeItem } from "./TreeItem.svelte";

export class SignalTreeItem extends TreeItem {
  type = "signal" as const;

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

  static itemNumber = 0;

  color = $state(
    SignalTreeItem.baseColors[
      SignalTreeItem.itemNumber++ % SignalTreeItem.baseColors.length
    ]
  );

  paint = (ctx: CanvasRenderingContext2D) => {};

  *generate(start: number, length: number): Generator<ValueChange> {}

  *getChanges(start: number, length: number): Generator<ValueChange> {
    yield* this.generate(
      Math.max(config.simulationStart, start),
      Math.min(config.simulationLength, length)
    );
  }

  *getChangePairs(
    start: number,
    width: number
  ): Generator<[ValueChange, ValueChange]> {
    yield* pairGenerator(this.getChanges(start, width));
  }
}
