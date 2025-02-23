import { config } from "$lib/data/config.svelte";
import { signalCanvas } from "$lib/data/signalCanvas.svelte";
import type { ChangesGenerator } from "./interfaces";

export const paintBitArray = (
  ctx: CanvasRenderingContext2D,
  getChanges: ChangesGenerator,
  textColor: string,
  lineColor: string
) => {
  ctx.font = `${config.fontSize}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle"

  const foregroundHSL = window
    .getComputedStyle(ctx.canvas)
    .getPropertyValue("--foreground");
  const foreground = `hsl(${foregroundHSL})`;
  ctx.fillStyle = foreground;

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

  const vCenter = (top + bottom) / 2;

  const changesGenerator = getChanges(drawStart);
  let x0 = 0;
  let valueChange = changesGenerator.next();
  while (!valueChange.done) {
    const [t, v] = valueChange.value;
    const x1 = signalCanvas.timeToX(t);
    const hCenter = (x1 + x0) / 2;
    if (t > drawEnd) {
      ctx.textAlign = "end";
      const s = v.toString();
      const width = ctx.measureText(s).width;
      const normalCenterTextEnd = hCenter + width / 2;
      ctx.fillText(v.toString(), Math.min(normalCenterTextEnd, drawEndX), vCenter)
      break;
    }
    ctx.fillText(v.toString(), hCenter, vCenter);
    ctx.moveTo(x1, top);
    ctx.lineTo(x1, bottom);

    valueChange = changesGenerator.next();
    x0 = x1;
  }

  ctx.stroke();
};
