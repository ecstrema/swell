import { config } from "$lib/data/config.svelte";
import { signalCanvas } from "$lib/data/signalCanvas.svelte";
import { SignalTreeItem } from "./SignalTreeItem.svelte";

export class BitArraySignalTreeItem extends SignalTreeItem {
  paint = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = this.color;
    ctx.lineWidth = config.lineWidth;

    const top = signalCanvas.signalTop();
    const bottom = signalCanvas.signalBottom();

    ctx.moveTo(0, top);
    ctx.lineTo(ctx.canvas.width, top);
    ctx.moveTo(0, bottom);
    ctx.lineTo(ctx.canvas.width, bottom);

    for (const [t, v] of this.getChanges(config.viewStart, config.viewWidth)) {
      const x = signalCanvas.timeToX(t);
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
    }

    ctx.stroke();
  };
}
