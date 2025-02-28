import { SignalCanvas } from '$lib/data/SignalCanvas.svelte';
import type { SwellState } from '$lib/data/SwellState.svelte';
import type { Painter } from '../interfaces';

export const getBitPainter = (state: SwellState): Painter => {
  const signalsCanvas = state.temp.signalsCanvas;

  const bitArrayPainter: Painter = ({ctx, changes}) => {
    ctx.textBaseline = 'middle';

    const top = signalsCanvas.getSignalTop();
    const bottom = signalsCanvas.getSignalBottom();
    const vCenter = (top + bottom) / 2;

    const changesIterator = changes(state.settings.viewStart);
    let valueChange = changesIterator.next();

    let x0 = signalsCanvas.timeToX(valueChange.value[0]);
    let v0 = valueChange.value[1];

    type FillTextFn = (x0: number, x1: number, s: string, hCenter: number, textWidth: number) => void;

    const fillText = (fn: FillTextFn) => {
      valueChange = changesIterator.next();
      const x1 = signalsCanvas.timeToX(valueChange.value[0]);
      const v1 = valueChange.value[1];

      if (v0 !== null) {
        const horizontalCenter = (x0 + x1) / 2;
        const s = v0.toStrings();
        const textWidth = SignalCanvas.measureTextWidth(ctx, s);

        fn(x0, x1, s, horizontalCenter, textWidth);
      }

      x0 = x1;
      v0 = v1;

      ctx.moveTo(x1, top);
      ctx.lineTo(x1, bottom);
    };

    const fillFirstText: FillTextFn = (x0, x1, s, hCenter, textWidth) => {
      const halfWidth = textWidth / 2;
      const minPosition = signalsCanvas.timeToX(state.settings.viewStart) + state.settings.representationPadding + halfWidth;
      const maxPosition = x1 - state.settings.representationPadding - halfWidth;

      ctx.fillText(s, Math.max(minPosition, Math.min(maxPosition, hCenter)), vCenter);
    };

    const fillMiddleText: FillTextFn = (x0, x1, s, hCenter, textWidth) => {
      const maxWidth = x1 - x0 - 2 * state.settings.representationPadding;
      if (textWidth <= maxWidth) {
        ctx.fillText(s, hCenter, vCenter);
      }
    };

    const fillEndText: FillTextFn = (x0, x1, s, hCenter, textWidth) => {
      const halfWidth = textWidth / 2;
      const maxPosition = signalsCanvas.timeToX(state.settings.viewEnd) - state.settings.representationPadding - halfWidth;
      const minPosition = x0 + state.settings.representationPadding + halfWidth;

      ctx.fillText(s, Math.min(maxPosition, Math.max(minPosition, hCenter)), vCenter);
    };

    fillText(fillFirstText);

    while (!valueChange.done && valueChange.value[0] < state.settings.viewEnd) {
      fillText(fillMiddleText);
    }

    fillText(fillEndText);

    ctx.stroke();
  };

  return bitArrayPainter;
};
