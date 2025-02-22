import { positiveModulo } from "$lib/math";
import { config } from "$lib/data/config.svelte";
import type { ValueChange } from "$lib/data/signals.svelte";
import { signalCanvas } from "$lib/data/signalCanvas.svelte";
import { SignalTreeItem } from "./SignalTreeItem.svelte";

export class ClockSignalTreeItem extends SignalTreeItem {
  // The clock starts low at time offset, and is high for dutyCycle * period
  constructor(
    name: string,
    public period: number = 2,
    public lowPeriod = 1,
    public offset = 0
  ) {
    super(name);
  }

  paint = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = this.color;
    ctx.lineWidth = config.lineWidth;

    const zero = signalCanvas.signalTop();
    const one = signalCanvas.signalBottom();

    for (const [[t1, v1], [t2, v2]] of this.getChangePairs(
      config.viewStart,
      config.viewWidth
    )) {
      const x1 = signalCanvas.timeToX(t1);
      const x2 = signalCanvas.timeToX(t2);
      // The beauty with this is that it is linear. The value could be 0.5 and it would draw a line in the middle.
      const y1 = zero + (1 - v1) * (one - zero);
      const y2 = zero + (1 - v2) * (one - zero);

      // We don't need this moveTo except for the first move.
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
  };

  getHighPeriod = () => {
    return this.period - this.lowPeriod;
  };

  *generate(start: number, length: number): Generator<ValueChange> {
    const previousStartTime =
      start - positiveModulo(start - this.offset, this.period);
    const isLowAtStart = start < previousStartTime + this.lowPeriod;

    if (length < this.period) {
      yield [start, +!isLowAtStart];
    }

    // Yield the value at start
    yield [start, +!isLowAtStart];
    // The loop after always yields the low, then the high. If we were low at start, we need to emit the high before jumping into the loop.
    if (isLowAtStart) {
      yield [previousStartTime + this.lowPeriod, 1];
    }

    const highPeriod = this.getHighPeriod();

    // End 1 cycle too early, and yield it after with start + length as time.
    const timeEnd = start + length;
    const loopEnd = timeEnd - this.period;
    let time = previousStartTime + this.period;
    while (time < loopEnd) {
      yield [time, 0];
      time += this.lowPeriod;
      yield [time, 1];
      time += highPeriod;
    }

    // Start of last period
    yield [time, 0];
    time += this.lowPeriod;

    if (time < timeEnd) {
      yield [time, 1];
      yield [timeEnd, 1];
    } else {
      yield [timeEnd, 0];
    }
  }
}
