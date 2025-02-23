import { config } from "$lib/data/config.svelte";
import { signalCanvas } from "$lib/data/signalCanvas.svelte";
import type { ChangesGenerator } from "./interfaces";

export const paintBitArray = (
  ctx: CanvasRenderingContext2D,
  getChanges: ChangesGenerator
) => {
  ctx.lineWidth = config.lineWidth;

  const top = signalCanvas.getSignalTop();
  const bottom = signalCanvas.getSignalBottom();

  const drawStart = config.getDrawStart();
  const drawEnd = config.getDrawEnd();

  const drawStartX = signalCanvas.timeToX(drawStart);
  const drawEndX = signalCanvas.timeToX(drawEnd);

  ctx.moveTo(drawStartX, top);
  ctx.lineTo(drawEndX, top);
  ctx.moveTo(drawStartX, bottom);
  ctx.lineTo(drawEndX, bottom);

  const changesGenerator = getChanges(drawStart);
  let valueChange = changesGenerator.next();
  while (!valueChange.done) {
    const t = valueChange.value[0];
    console.log(t);
    if (t > drawEnd) {
      break;
    }
    const x = signalCanvas.timeToX(t);
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    valueChange = changesGenerator.next();
  }

  ctx.stroke();
};
