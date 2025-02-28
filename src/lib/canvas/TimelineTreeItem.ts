import type { SwellState } from '$lib/data/SwellState.svelte';
import type { Painter } from './interfaces';

export const getTimelinePainter = (state: SwellState): Painter => {
  const getStepsSize = () => {
    const config = state.settings;
    const tickCount = state.temp.signalsCanvas.pixelWidth / config.timelinePixelBetweenTicks;
    const tickInterval = config.getViewLength() / tickCount;
    const idealSecondaryStep = 10 ** Math.ceil(Math.log10(tickInterval));
    const primaryStep = idealSecondaryStep * config.timelineSecondaryTicksBetweenPrimary;
    const secondaryStep = Math.max(1, primaryStep / config.timelineSecondaryTicksBetweenPrimary);
    return { primaryStep, secondaryStep };
  };

  const getNextTick = (t: number, step: number) => {
    return Math.ceil(t / step) * step;
  };

  const getNextPrimaryTick = (t: number) => {
    return getNextTick(t, getStepsSize().primaryStep);
  };

  const getNextSecondaryTick = (t: number) => {
    return getNextTick(t, getStepsSize().secondaryStep);
  };

  function* generateTimelineTicks(): Generator<{
    type: 'primary' | 'secondary';
    value: number;
  }> {
    let t = getNextSecondaryTick(state.settings.viewStart);

    const { primaryStep, secondaryStep } = getStepsSize();
    while (true) {
      yield {
        type: t % primaryStep === 0 ? 'primary' : 'secondary',
        value: t,
      };
      t += secondaryStep;
    }
  }

  const paintTimeline: Painter = ({ ctx, state }) => {
    const foregroundHSL = window.getComputedStyle(ctx.canvas).getPropertyValue('--foreground');
    const foreground = `hsl(${foregroundHSL})`;

    const config = state.settings;

    ctx.fillStyle = foreground;
    ctx.strokeStyle = foreground;
    ctx.lineWidth = config.lineWidth;
    ctx.font = `${config.fontSize}px monospace`;
    ctx.textAlign = 'center';

    const primaryTickEnd = config.itemHeight - config.itemPadding - config.fontSize;
    const secondaryTickEnd = config.itemHeight - config.itemPadding;

    const timeToX = state.temp.signalsCanvas.timeToX;

    for (const { type, value } of generateTimelineTicks()) {
      if (value > config.viewEnd) break;
      const x = timeToX(value);

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

  return paintTimeline;
}
