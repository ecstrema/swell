<script lang="ts">
import type { Paintable } from '$lib/canvas/interfaces';
import { swellState } from '$lib/data/SwellState.svelte';
import { signalCanvas } from '$lib/data/Canvas.svelte';
import { onMount } from 'svelte';

const { item }: { item: Paintable } = $props();

let canvas: HTMLCanvasElement | null = null;

onMount(() => {
  const setCtx = () => {
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        item.ctx = ctx;
        return;
      }
    }
    requestAnimationFrame(setCtx);
  };
  setCtx();
});
</script>

<canvas
  bind:this={canvas}
  bind:clientWidth={signalCanvas.width}
  class="w-full"
  style:height={`${swellState.config.itemHeight}px`}
></canvas>
