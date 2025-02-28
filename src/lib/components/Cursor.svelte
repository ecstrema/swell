<script lang="ts">
  import { signalCanvas } from '$lib/data/Canvas.svelte';
import { swellState } from '$lib/data/SwellState.svelte';
import { bound } from '$lib/math';
import { useBoundingRect } from '$lib/use/useBoundingRect.svelte';
import { useMousePosition } from '$lib/use/useMousePosition.svelte';

const frame = useBoundingRect();
const mouse = useMousePosition();

const x = $derived.by(() => {
  if (!frame.rect) return 0;
  return bound(mouse.x - frame.rect.left, 0, frame.rect.width) - swellState.settings.cursorWidth / 2;
});

$effect(() => {
    swellState.temp.cursorPosition = signalCanvas.xToTime(x);
})
</script>

<div class="inset-0 absolute pointer-events-none" bind:this={frame.ref}>
    <div
        class="relative h-full"
        style:left="{x}px"
        style:width="{swellState.settings.cursorWidth}px"
        style:background-color={swellState.settings.cursorColor}
    ></div>
</div>
