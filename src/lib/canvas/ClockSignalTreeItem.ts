import { signalCanvas } from '$lib/data/Canvas.svelte';
import { swellState } from "$lib/data/SwellState.svelte";
import { normalizedLinearInterpolation, positiveModulo } from '$lib/math';
import { StyledTreeItem } from './StyledTreeItem';
import type { Paintable, Signal, ValueChange } from './interfaces';

type ClockValue = boolean | null
type A = Paintable & Signal<ClockValue>;


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

  ctx: CanvasRenderingContext2D | undefined;

  paint = () => {
    if (!this.ctx) {
      return;
    }

    this.setStyle(this.ctx);

    const zero = signalCanvas.getSignalTop();
    const one = signalCanvas.getSignalBottom();

    const toXY = (valueChange: ValueChange<boolean>) => {
      return [signalCanvas.timeToX(valueChange[0]), normalizedLinearInterpolation(Number(valueChange[1]), zero, one)];
    };

    const drawStart = swellState.settings.getDrawStart();
    const drawEnd = swellState.settings.getDrawEnd();

    const changesGenerator = this.getChanges(drawStart);
    let valueChange = changesGenerator.next();

    let [x1, y1] = toXY(valueChange.value);
    this.ctx.moveTo(x1, y1);

    let y0 = y1;
    while (!valueChange.done) {
      valueChange = changesGenerator.next();
      [x1, y1] = toXY(valueChange.value);

      this.ctx.lineTo(x1, y0);
      if (valueChange.value[0] >= drawEnd) {
        break;
      }
      this.ctx.lineTo(x1, y1);

      y0 = y1;
    }

    this.ctx.stroke();
  };

  getHighPeriod = () => {
    return this.period - this.lowPeriod;
  };

  getPreviousPeriodStartTime = (t: number) => {
    return t - positiveModulo(t - this.offset, this.period);
  };

  *generatePeriods(time: number): Generator<ValueChange<ClockValue>> {
    let t = time;
    while (true) {
      yield [t, false];
      yield [t + this.lowPeriod, true];
      t += this.period;
    }
  }

  getValue = (time: number) => {
    return +!(time < this.getPreviousPeriodStartTime(time) + this.lowPeriod);
  };

  *getChanges(start: number): Generator<ValueChange<ClockValue>> {
    // yield all from before the startTime to after the endTime
    const previousPeriodStartTime = this.getPreviousPeriodStartTime(start);

    const isLowAtStart = start < previousPeriodStartTime + this.lowPeriod;

    if (isLowAtStart) {
      yield [start, false];
      yield [previousPeriodStartTime + this.lowPeriod, true];
    } else {
      yield [start, true];
    }

    yield* this.generatePeriods(previousPeriodStartTime + this.period);
  }
}
