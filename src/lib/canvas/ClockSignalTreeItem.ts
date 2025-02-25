import { config } from '$lib/data/config.svelte';
import { signalCanvas } from '$lib/data/signalCanvas.svelte';
import { bound, normalizedLinearInterpolation, positiveModulo } from '$lib/math';
import { StyledTreeItem } from './StyledTreeItem';
import type { Paintable, Signal, ValueChange } from './interfaces';

type A = Paintable & Signal;

export class ClockSignalTreeItem extends StyledTreeItem implements A {
  // The clock starts low at time offset, and is high for dutyCycle * period
  constructor(
    name: string,
    public period = 2,
    public lowPeriod = 1,
    public offset = 0,
  ) {
    super(name);
  }

  paint = (ctx: CanvasRenderingContext2D) => {
    this.setStyle(ctx);

    const zero = signalCanvas.getSignalTop();
    const one = signalCanvas.getSignalBottom();

    const toXY = (valueChange: ValueChange) => {
      return [signalCanvas.timeToX(valueChange[0]), normalizedLinearInterpolation(valueChange[1], zero, one)];
    };

    const drawStart = config.getDrawStart();
    const drawEnd = config.getDrawEnd();

    const changesGenerator = this.getChanges(drawStart);
    let valueChange = changesGenerator.next();

    let [x1, y1] = toXY(valueChange.value);
    ctx.moveTo(x1, y1);

    let y0 = y1;
    while (!valueChange.done) {
      valueChange = changesGenerator.next();
      [x1, y1] = toXY(valueChange.value);

      ctx.lineTo(x1, y0);
      if (valueChange.value[0] >= drawEnd) {
        break;
      }
      ctx.lineTo(x1, y1);

      y0 = y1;
    }

    ctx.stroke();
  };

  getHighPeriod = () => {
    return this.period - this.lowPeriod;
  };

  getPreviousPeriodStartTime = (t: number) => {
    return t - positiveModulo(t - this.offset, this.period);
  };

  *generatePeriods(time: number): Generator<ValueChange> {
    let t = time;
    while (true) {
      yield [time, 0];
      yield [time + this.lowPeriod, 1];
      t += this.period;
    }
  }

  getValue = (time: number) => {
    return +!(time < this.getPreviousPeriodStartTime(time) + this.lowPeriod);
  };

  *getChanges(start: number): Generator<ValueChange> {
    // yield all from before the startTime to after the endTime
    const previousPeriodStartTime = this.getPreviousPeriodStartTime(start);

    const isLowAtStart = start < previousPeriodStartTime + this.lowPeriod;

    if (isLowAtStart) {
      yield [start, 0];
      yield [previousPeriodStartTime + this.lowPeriod, 1];
    } else {
      yield [start, 1];
    }

    yield* this.generatePeriods(previousPeriodStartTime + this.period);
  }
}
