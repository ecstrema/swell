import { swellState } from '$lib/data/SwellState.svelte';
import { signalCanvas } from '$lib/data/Canvas.svelte';
import { TreeItem } from './TreeItem.svelte';
import type { LocalValued, Paintable } from './interfaces';

type A = Paintable & LocalValued;

export class TimelineTreeItem extends TreeItem implements A {
  static getStepsSize(): { primaryStep: number; secondaryStep: number } {
    const config = swellState.settings;
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
    let t = this.getNextSecondaryTick(swellState.settings.viewStart);

    const { primaryStep, secondaryStep } = TimelineTreeItem.getStepsSize();
    while (true) {
      yield {
        type: t % primaryStep === 0 ? 'primary' : 'secondary',
        value: t,
      };
      t += secondaryStep;
    }
  }

  ctx: CanvasRenderingContext2D | undefined;

  paint = () => {
    if (!this.ctx) {
      return;
    }

    const foregroundHSL = window.getComputedStyle(this.ctx.canvas).getPropertyValue('--foreground');
    const foreground = `hsl(${foregroundHSL})`;

    const config = swellState.settings;

    this.ctx.fillStyle = foreground;
    this.ctx.strokeStyle = foreground;
    this.ctx.lineWidth = config.lineWidth;
    this.ctx.font = `${config.fontSize}px monospace`;
    this.ctx.textAlign = 'center';

    const primaryTickEnd = config.itemHeight - config.itemPadding - config.fontSize;
    const secondaryTickEnd = config.itemHeight - config.itemPadding;

    for (const { type, value } of this.generateTicks()) {
      if (value > config.viewEnd) break;
      const x = signalCanvas.timeToX(value);

      this.ctx.moveTo(x, config.itemPadding);
      if (type === 'primary') {
        this.ctx.lineTo(x, primaryTickEnd);
        this.ctx.fillText(value.toFixed(0), x, config.itemHeight - config.itemPadding);
      } else {
        this.ctx.lineTo(x, secondaryTickEnd);
      }
    }

    this.ctx.stroke();
  };
}
