import { config } from '$lib/data/config.svelte';
import { signalCanvas } from '$lib/data/signalCanvas.svelte';
import { TreeItem } from './TreeItem.svelte';
import type { LocalValued, Paintable } from './interfaces';

type A = Paintable & LocalValued;

export class TimelineTreeItem extends TreeItem implements A {
  static getStepsSize(): { primaryStep: number; secondaryStep: number } {
    const tickCount = signalCanvas.pixelWidth / config.timelinePixelBetweenTicks;
    const tickInterval = config.getViewLength() / tickCount;
    const idealSecondaryStep = 10 ** Math.ceil(Math.log10(tickInterval));
    const primaryStep = idealSecondaryStep * config.timelineSecondaryTicksBetweenPrimary;
    const secondaryStep = Math.max(1, primaryStep / config.timelineSecondaryTicksBetweenPrimary);
    return { primaryStep, secondaryStep };
  }

  /** Identity, as the value at point t for a timeline is the time itself */
  getValue = (t: number) => {
    return t;
  };

  getNextTick = (t: number, step: number) => {
    return Math.ceil(t / step) * step;
  };

  getNextPrimaryTick = (t: number) => {
    return this.getNextTick(t, TimelineTreeItem.getStepsSize().primaryStep);
  };

  getNextSecondaryTick = (t: number) => {
    return this.getNextTick(t, TimelineTreeItem.getStepsSize().secondaryStep);
  };

  *generateTicks(): Generator<{
    type: 'primary' | 'secondary';
    value: number;
  }> {
    let t = this.getNextSecondaryTick(config.viewStart.value);

    const { primaryStep, secondaryStep } = TimelineTreeItem.getStepsSize();
    while (true) {
      yield {
        type: t % primaryStep === 0 ? 'primary' : 'secondary',
        value: t,
      };
      t += secondaryStep;
    }
  }

  paint = (ctx: CanvasRenderingContext2D) => {
    const foregroundHSL = window.getComputedStyle(ctx.canvas).getPropertyValue('--foreground');
    const foreground = `hsl(${foregroundHSL})`;

    ctx.fillStyle = foreground;
    ctx.strokeStyle = foreground;
    ctx.lineWidth = config.lineWidth;
    ctx.font = `${config.fontSize}px monospace`;
    ctx.textAlign = 'center';

    const primaryTickEnd = config.itemHeight - config.itemPadding - config.fontSize;
    const secondaryTickEnd = config.itemHeight - config.itemPadding;

    for (const { type, value } of this.generateTicks()) {
      if (value > config.viewEnd.value) break;
      const x = signalCanvas.timeToX(value);

      ctx.moveTo(x, config.itemPadding);
      if (type === 'primary') {
        ctx.lineTo(x, primaryTickEnd);
        ctx.fillText(value.toFixed(0), x, config.itemHeight - config.itemPadding);
      } else {
        ctx.lineTo(x, secondaryTickEnd);
      }
    }

    ctx.stroke();
  };
}
