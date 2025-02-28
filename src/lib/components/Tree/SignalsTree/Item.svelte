<script lang="ts">
import { TreeItem } from '$lib/canvas/TreeItem.svelte';
import { isPaintable } from '$lib/canvas/interfaces';
import { swellState } from '$lib/data/SwellState.svelte';
import Canvas from './Canvas.svelte';
import Item from './Item.svelte';

const { item }: { item: TreeItem } = $props();
</script>

{#if isPaintable(item)}
 <Canvas {item} />
{:else}
  <div
    style:height={`${swellState.settings.itemHeight}px`}
    class="w-full"
    ></div>
{/if}

{#if item.expanded}
  {#each item.children as child}
    <Item item={child} />
  {/each}
{/if}
