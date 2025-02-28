<script lang="ts">
import { getContext, onMount } from 'svelte';
import type { TreeItem } from '$lib/canvas/TreeItem.svelte';
import type { SwellState } from '$lib/data/SwellState.svelte';

const { item }: { item: TreeItem } = $props();

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

const swellState = getContext<SwellState>('swellState');
</script>

<canvas
  bind:this={canvas}
  bind:clientWidth={swellState.temp.signalsCanvas.width}
  class="w-full"
  style:height={`${swellState.settings.itemHeight}px`}
></canvas>
