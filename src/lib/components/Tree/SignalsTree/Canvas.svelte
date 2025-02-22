<script module lang="ts">
  export class PaintState {
    dirty = $state(false);
    width = $state(100);
    pixelWidth = $derived.by(
      () => this.width * (devicePixelRatio.current || 1)
    );
    pixelHeight = $derived.by(
      () => config.itemHeight * (devicePixelRatio.current || 1)
    );
    pixelsPerSecond = $derived.by(() => this.pixelWidth / config.viewWidth);
  }

  export const paintState = new PaintState();
</script>

<script lang="ts">
  import { causesCanvasRepaint, config } from "$lib/data/config.svelte";
  import { mode } from "mode-watcher";
  import { devicePixelRatio } from "svelte/reactivity/window";

  const { paint }: { paint: (ctx: CanvasRenderingContext2D) => void } =
    $props();

  let canvas: HTMLCanvasElement | null = null;

  function requestPaint() {
    function doPaint() {
      if (!canvas) {
        requestAnimationFrame(doPaint);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        requestAnimationFrame(doPaint);
        return;
      }

      paintState.dirty = false;

      // This has to be here because changing the canvas size clears it, so if we put it directly in the canvas declaration, we don't know when svelte will update it, and thus clear the canvas.
      canvas.height = paintState.pixelHeight;
      canvas.width = paintState.pixelWidth;
      // ctx.clearRect(0, 0, pixelWidth, pixelHeight);

      paint(ctx);
    }
    requestAnimationFrame(doPaint);
  }

  mode.subscribe(() => {
    requestPaint();
  });

  $effect(() => {
    for (const key of causesCanvasRepaint) {
      const _ = config[key];
    }
    requestPaint();
  });

  $effect(() => {
    if (paintState.dirty) {
      requestPaint();
    }
  });
</script>

<canvas
  bind:this={canvas}
  bind:clientWidth={() => paintState.width,
  (v) => {
    paintState.width = v;
    paintState.dirty = true;
  }}
  class="w-full"
  style:height={`${config.itemHeight}px`}
></canvas>
