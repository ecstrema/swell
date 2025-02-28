import { swellState } from '$lib/data/SwellState.svelte';
import { SignalCanvas, signalCanvas } from '$lib/data/Canvas.svelte';
import type { ChangesGenerator, SignalValue } from './interfaces';

export const paintBitArray = (ctx: CanvasRenderingContext2D, getChanges: ChangesGenerator) => {
  ctx.font = `${swellState.settings.fontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const foregroundHSL = window.getComputedStyle(ctx.canvas).getPropertyValue('--foreground');
  const foreground = `hsl(${foregroundHSL})`;
  ctx.fillStyle = foreground;

  const top = signalCanvas.getSignalTop();
  const bottom = signalCanvas.getSignalBottom();

  const drawStart = swellState.settings.getDrawStart();
  const drawEnd = swellState.settings.getDrawEnd();

  const drawStartX = signalCanvas.timeToX(drawStart);
  const drawEndX = signalCanvas.timeToX(drawEnd);

  ctx.moveTo(drawStartX, top);
  ctx.lineTo(drawEndX, top);
  ctx.moveTo(drawStartX, bottom);
  ctx.lineTo(drawEndX, bottom);

  const vCenter = (top + bottom) / 2;

  const changesGenerator = getChanges(drawStart);
  let x0 = 0;
  let v0: SignalValue = null;
  let valueChange = changesGenerator.next();
  while (!valueChange.done) {
    const [t, v] = valueChange.value;
    const x1 = signalCanvas.timeToX(t);

    if (v0 !== null) {
      const horizontalCenter = (x0 + x1) / 2;
      const s = v0.toString();
      const textWidth = SignalCanvas.measureTextWidth(ctx, s);

      const neededWidth = textWidth + 2 * swellState.settings.representationPadding;
      const availableWidth = x1 - x0;
      if (availableWidth >= neededWidth) {
        if (t > drawEnd) {
          ctx.textAlign = 'end';
          const normalCenterTextEnd = horizontalCenter + textWidth / 2;
          const maxEnd = drawEndX - swellState.settings.representationPadding;
          const minEnd = x0 + textWidth + swellState.settings.representationPadding;
          ctx.fillText(s, Math.max(minEnd, Math.min(maxEnd, normalCenterTextEnd)), vCenter);
        } // No need to to handle draw start, as we do it before the loop
        else {
          ctx.fillText(s, horizontalCenter, vCenter);
        }
      }
    }

    if (t >= drawEnd) {
      break;
    }

    ctx.moveTo(x1, top);
    ctx.lineTo(x1, bottom);

    valueChange = changesGenerator.next();
    x0 = x1;
    v0 = v;
  }

  ctx.stroke();
};
