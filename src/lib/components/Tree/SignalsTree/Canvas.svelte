<script lang="ts">
import { config } from '$lib/data/config.svelte';
import { signalCanvas } from '$lib/data/signalCanvas.svelte';

const { paint }: { paint: (ctx: CanvasRenderingContext2D) => void } = $props();

// biome-ignore lint: this is reassigned by svelte
let canvas: HTMLCanvasElement | null = null;

function requestPaint() {
  function doPaint() {
    if (!canvas) {
      requestAnimationFrame(doPaint);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      requestAnimationFrame(doPaint);
      return;
    }

    // Reset as soon as possible, so that if other things change will it's being painted, we know we need to repaint
    signalCanvas.dirty = false;

    // This has to be here because changing the canvas size clears it, so if we put it directly in the canvas declaration, we don't know when svelte will update it, and thus clear the canvas.
    canvas.height = signalCanvas.pixelHeight;
    canvas.width = signalCanvas.pixelWidth;
    // ctx.clearRect(0, 0, pixelWidth, pixelHeight);

    paint(ctx);
  }
  requestAnimationFrame(doPaint);
}

$effect(() => {
  if (signalCanvas.dirty) {
    requestPaint();
  }
});
</script>

<canvas
  bind:this={canvas}
  bind:clientWidth={() => signalCanvas.width,
  (v) => {
    signalCanvas.width = v;
    signalCanvas.dirty = true;
  }}
  class="w-full"
  style:height={`${config.itemHeight}px`}
></canvas>
