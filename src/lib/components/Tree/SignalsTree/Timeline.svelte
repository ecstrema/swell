<script lang="ts">
  import { config } from "$lib/data/config.svelte";
  import Canvas, { paintState } from "./Canvas.svelte";

  function* tickGenerator(start: number, end: number) : Generator<{type: "primary" | "secondary", value: number, label: string}> {
    const primaryStep = 10 ** Math.floor(Math.log10(end - start));
    const secondaryStep = primaryStep / 10;

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

    for (const { type, value, label } of tickGenerator(config.viewStart, config.viewEnd)) {
      const x = (value - config.viewStart) * paintState.pixelsPerSecond;

      if (type === "primary") {
        const height = config.itemHeight - config.itemPadding - config.treeFontSize;
        console.log(height)
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
