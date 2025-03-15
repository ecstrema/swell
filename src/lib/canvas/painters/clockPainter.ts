import { normalizedLinearInterpolation } from "$lib/utils/math";
import type { Painter, ValueChange } from "../interfaces";

export const clockPainter: Painter = ({ctx, changes, state}) => {
  const signalsCanvas = state.temp.signalsCanvas;
  const bottom = signalsCanvas.getSignalTop();
  const top = signalsCanvas.getSignalBottom();

  const toXY = (valueChange: ValueChange<boolean>) => {
    return [signalsCanvas.timeToX(valueChange[0]), normalizedLinearInterpolation(Number(valueChange[1]), bottom, top)];
  };

  const changesIterator = changes(state.settings.viewStart);
  let valueChange = changesIterator.next();

  let [x1, y1] = toXY(valueChange.value);
  ctx.moveTo(x1, y1);

  let y0 = y1;
  while (!valueChange.done) {
    valueChange = changesIterator.next();
    [x1, y1] = toXY(valueChange.value);

    ctx.lineTo(x1, y0);
    if (valueChange.value[0] >= state.settings.viewEnd) {
      break;
    }
    ctx.lineTo(x1, y1);

    y0 = y1;
  }

  ctx.stroke();
};
