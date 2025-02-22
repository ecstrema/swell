import { BitArraySignalTreeItem } from "./BitArraySignalTreeItem.svelte";
import type { ValueChange } from "$lib/data/signals.svelte";

export class CounterSignalTreeItem extends BitArraySignalTreeItem {
  constructor(
    name: string,
    public startValue: number,
    public increment: number,
    public incrementCount: number,
    public incrementPeriod = 1,
    public periodOffset = 0
  ) {
    super(name);
  }

  *generate(start: number, width: number): Generator<ValueChange> {
    const end = start + width;
    for (let i = start; i < end; i += this.increment) {
      yield [i, (i % this.incrementCount) + this.startValue];
    }
  }
}
