<script lang="ts">
  import type { SignalTreeItem } from "$lib/data/data.svelte";
  import { config } from "$lib/data/config.svelte";
  import Canvas, { paintState } from "./Canvas.svelte";

  const { item }: { item: SignalTreeItem } = $props();

  function paint(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = item.color;
    ctx.lineWidth = config.lineWidth;

    const zero =
      (config.itemPadding / config.itemHeight) * paintState.pixelHeight;
    const one =
      ((config.itemHeight - config.itemPadding) / config.itemHeight) *
      paintState.pixelHeight;

    for (const [[t1, v1], [t2, v2]] of item.getChangePairs(
      config.viewStart,
      config.viewWidth
    )) {
      const x1 = (t1 - config.viewStart) * paintState.pixelsPerSecond;
      const x2 = (t2 - config.viewStart) * paintState.pixelsPerSecond;
      const y1 = zero + (1 - v1) * (one - zero);
      const y2 = zero + (1 - v2) * (one - zero);

      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
  }
</script>

<Canvas {paint} />
