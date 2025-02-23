import { config } from "$lib/data/config.svelte";
import { signalCanvas } from "$lib/data/signalCanvas.svelte";
import type { Paintable, LocalValued } from "./interfaces";
import { TreeItem } from "./TreeItem.svelte";

type A = Paintable & LocalValued;

export class TimelineTreeItem extends TreeItem implements A {
  secondaryStep = $derived.by(() =>
    Math.max(1, this.primaryStep / config.timelineSecondaryTicksBetweenPrimary)
  );

  primaryStep = $derived.by(() => {
    const tickCount =
      signalCanvas.pixelWidth / config.timelinePixelBetweenTicks;
    const tickInterval = config.viewLength / tickCount;
    const idealSecondaryStep = 10 ** Math.ceil(Math.log10(tickInterval));
    return idealSecondaryStep * config.timelineSecondaryTicksBetweenPrimary;
  });

  getValue = (t: number) => {
    return t;
  };

  getNextTick = (t: number, step: number) => {
    return Math.ceil(t / step) * step;
  };

  getNextPrimaryTick = (t: number) => {
    return this.getNextTick(t, this.primaryStep);
  };

  getNextSecondaryTick = (t: number) => {
    return this.getNextTick(t, this.secondaryStep);
  };

  *generateTicks(): Generator<{
    type: "primary" | "secondary";
    value: number;
  }> {
    let t = this.getNextSecondaryTick(config.viewStart);

    while (true) {
      yield {
        type: t % this.primaryStep === 0 ? "primary" : "secondary",
        value: t,
      };
      t += this.secondaryStep;
    }
  }

  paint = (ctx: CanvasRenderingContext2D) => {
    const foregroundHSL = window
      .getComputedStyle(ctx.canvas)
      .getPropertyValue("--foreground");
    const foreground = `hsl(${foregroundHSL})`;

    ctx.fillStyle = foreground;
    ctx.strokeStyle = foreground;
    ctx.lineWidth = config.lineWidth;
    ctx.font = `${config.fontSize}px monospace`;
    ctx.textAlign = "center";

    const primaryTickEnd =
      config.itemHeight - config.itemPadding - config.fontSize;
    const secondaryTickEnd = config.itemHeight - config.itemPadding;

    for (const { type, value } of this.generateTicks()) {
      if (value > config.viewEnd) break;
      const x = signalCanvas.timeToX(value);

      ctx.moveTo(x, config.itemPadding);
      if (type === "primary") {
        ctx.lineTo(x, primaryTickEnd);
        ctx.fillText(
          value.toFixed(0),
          x,
          config.itemHeight - config.itemPadding
        );
      } else {
        ctx.lineTo(x, secondaryTickEnd);
      }
    }

    ctx.stroke();
  };
}
