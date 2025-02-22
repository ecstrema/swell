import { config } from "./config.svelte";
import { paintState } from "./paintstate.svelte";

export class TreeItem {
  selected = $state(false);
  constructor(public name: string) {}

  toggleSelected = () => {
    this.selected = !this.selected;
  };
}

export class GroupTreeItem extends TreeItem {
  type = "group" as const;
  children: TreeItems[] = $state([]);
  expanded = $state(true);

  constructor(name: string, children: TreeItems[] = []) {
    super(name);
    this.children = children;
  }
}

export type ValueChange = [number, number];

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

  timeToX = (t: number) => {
    return (t - config.viewStart) * paintState.pixelsPerSecond;
  };

  signalTop = () => {
    return (config.itemPadding / config.itemHeight) * paintState.pixelHeight;
  };

  signalBottom = () => {
    return (
      ((config.itemHeight - config.itemPadding) / config.itemHeight) *
      paintState.pixelHeight
    );
  };

  *generate(start: number, end: number): Generator<ValueChange> {
    yield [start, 0];
    yield [end, 1];
  }

  // Takes an existing generator, and returns pairs of values lie [0, 1], [1, 2], [2, 3] etc
  static *pairGenerator<T>(generator: Generator<T>): Generator<[T, T]> {
    let lastValue = generator.next();
    let nextValue = generator.next();

    while (!lastValue.done && !nextValue.done) {
      yield [lastValue.value, nextValue.value];
      lastValue = nextValue;
      nextValue = generator.next();
    }
  }

  *getChanges(start: number, width: number): Generator<ValueChange> {
    yield* this.generate(start, width);
  }

  *getChangePairs(
    start: number,
    width: number
  ): Generator<[ValueChange, ValueChange]> {
    yield* SignalTreeItem.pairGenerator(this.getChanges(start, width));
  }
}

export class BitArraySignalTreeItem extends SignalTreeItem {
  override paint = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = this.color;
    ctx.lineWidth = config.lineWidth;

    const top = this.signalTop();
    const bottom = this.signalBottom();

    ctx.moveTo(top, 0);
    ctx.lineTo(top, ctx.canvas.width);
    ctx.moveTo(bottom, 0);
    ctx.lineTo(bottom, ctx.canvas.width);

    for (const [t, v] of this.getChanges(config.viewStart, config.viewWidth)) {
      const x = this.timeToX(t);
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
    }

    ctx.stroke();
  };
}

export class CounterSignalTreeItem extends SignalTreeItem {
  constructor(
    name: string,
    public offset: number,
    public increment: number,
    public singlePeriod: number
  ) {
    super(name);
  }

  *generate(start: number, end: number): Generator<ValueChange> {
    // TODO
  }
}

export class ClockSignalTreeItem extends SignalTreeItem {
  // The clock starts low at time offset, and is high for dutyCycle * period
  constructor(
    name: string,
    public period: number = 1,
    public dutyCycle = 0.5,
    public offset = 0
  ) {
    super(name);
  }

  override paint = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = this.color;
    ctx.lineWidth = config.lineWidth;

    const zero = this.signalTop();
    const one = this.signalBottom();

    for (const [[t1, v1], [t2, v2]] of this.getChangePairs(
      config.viewStart,
      config.viewWidth
    )) {
      const x1 = this.timeToX(t1);
      const x2 = this.timeToX(t2);
      const y1 = zero + (1 - v1) * (one - zero);
      const y2 = zero + (1 - v2) * (one - zero);

      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
  };

  override *generate(start: number, width: number): Generator<ValueChange> {
    // yield all from before the startTime to after the endTime
    const mod = (start - this.offset) % this.period;
    const previousChangeTime = start - (mod < 0 ? mod + this.period : mod);
    const end = start + width + this.period; // Add one period to ensure we get the last change
    const lowPeriod = (1 - this.dutyCycle) * this.period;
    for (let time = previousChangeTime; time < end; time += this.period) {
      yield [time, 0];
      yield [time + lowPeriod, 1];
    }
  }
}

export type TreeItems = GroupTreeItem | SignalTreeItem;

export const root = $state(
  new GroupTreeItem("root", [
    new GroupTreeItem("signal1", [new ClockSignalTreeItem("signal1.1")]),
    new ClockSignalTreeItem("signal2", 4, 0.25, 0),
    new ClockSignalTreeItem("signal3", 4, 0.25, 1),
    new ClockSignalTreeItem("signal4", 4, 0.5, 2),
  ])
);
