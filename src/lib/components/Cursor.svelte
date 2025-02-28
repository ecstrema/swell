<script lang="ts">
import { SwellState } from '$lib/data/SwellState.svelte';
import { bound } from '$lib/math';
import { useBoundingRect } from '$lib/use/useBoundingRect.svelte';
import { useMousePosition } from '$lib/use/useMousePosition.svelte';
  import { getContext } from 'svelte';

const frame = useBoundingRect();
const mouse = useMousePosition();

const swellState = getContext<SwellState>('swellState');
const signalsCanvas = swellState.temp.signalsCanvas;
const settings = swellState.settings;

const x = $derived.by(() => {
  if (!frame.rect) return 0;
  return bound(mouse.x - frame.rect.left, 0, frame.rect.width) - settings.cursorWidth / 2;
});

$effect(() => {
    swellState.temp.cursorPosition = signalsCanvas.xToTime(x);
})
</script>

<div class="inset-0 absolute pointer-events-none" bind:this={frame.ref}>
    <div
        class="relative h-full"
        style:left="{x}px"
        style:width="{settings.cursorWidth}px"
        style:background-color={settings.cursorColor}
    ></div>
</div>
