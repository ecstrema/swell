<script lang="ts">
  import { config } from "$lib/data/config.svelte";
  import { signalCanvas } from "$lib/data/signalCanvas.svelte";
  import Canvas from "./Canvas.svelte";

  function* generate(start: number, end: number) : Generator<{type: "primary" | "secondary", value: number, label: string}> {
    const primaryStep = 10 ** Math.floor(Math.log10(end - start));
    const secondaryStep = primaryStep / 8; // 8 ticks avoids the rounding errors... Else when the primaryStep is 1 and the secondary is 0.1, we have rounding errors creating double bars...

    let primary = Math.floor(start / primaryStep) * primaryStep;
    let secondary = Math.floor(start / secondaryStep) * secondaryStep;

    while (primary < end) {
      yield { type: "primary", value: primary, label: primary.toFixed(0) };
      primary += primaryStep;
      secondary += secondaryStep;

      while (secondary < primary) {
        yield { type: "secondary", value: secondary, label: secondary.toFixed(0) };
        secondary += secondaryStep;
      }
    }
  }

  function paint(ctx: CanvasRenderingContext2D) {
    const foreground = `hsl(${window.getComputedStyle(ctx.canvas).getPropertyValue("--foreground")})`
    ctx.fillStyle = foreground;
    ctx.strokeStyle = foreground;
    ctx.font = `${config.treeFontSize}px monospace`;
    ctx.textAlign = "center";

    for (const { type, value, label } of generate(config.viewStart, config.viewEnd)) {
      const x = (value - config.viewStart) * signalCanvas.pixelsPerTimeUnit;

      if (type === "primary") {
        const height = config.itemHeight - config.itemPadding - config.treeFontSize;
        ctx.fillRect(x, config.itemPadding, 1, height);
        ctx.fillText(label, x, config.itemHeight - config.itemPadding);
      } else {
        const height = config.itemHeight - config.itemPadding * 2;
        ctx.fillRect(x, config.itemPadding, 1, height);
      }
    }
  }
</script>

<Canvas paint={paint} />
