import { StyledTreeItem } from './StyledTreeItem';
import type { Paintable, Signal, ValueChange } from './interfaces';
import { paintBitArray } from './paintValueArray';

type A = Paintable & Signal;

export class CounterSignalTreeItem extends StyledTreeItem implements A {
  constructor(
    name: string,
    public startValue: number,
    public increment: number,
    public incrementCount: number,
    public incrementPeriod = 1,
    public offset = 0,
  ) {
    super(name);

    if (incrementPeriod <= 0) {
      console.error('Increment period should be greater than 0.');
      this.incrementPeriod = 1;
    }
  }

  getFullPeriod = () => {
    return this.incrementCount * this.incrementPeriod;
  };

  ctx: CanvasRenderingContext2D | undefined;

  paint = () => {
    if (!this.ctx) {
      return;
    }

    this.setStyle(this.ctx);
    paintBitArray(this.ctx, this.getChanges.bind(this), this.color, this.color);
  };

  getPreviousPeriodStartTime = (time: number) => {
    const fullPeriod = this.getFullPeriod();
    return ((time - this.offset) % fullPeriod) - fullPeriod;
  };

  getValue = (time: number) => {
    const previousPeriodStartTime = this.getPreviousPeriodStartTime(time);
    const incrementPeriodsSincePreviousPeriodStart = Math.floor((time - previousPeriodStartTime) / this.incrementPeriod);
    return incrementPeriodsSincePreviousPeriodStart * this.increment + this.startValue;
  };

  *getChanges(start: number): Generator<ValueChange> {
    // TODO: proper counter
    let i = 0;
    while (true) {
      yield [i * this.incrementPeriod + start, (i % this.incrementCount) + this.startValue];
      i++;
    }
  }
}
