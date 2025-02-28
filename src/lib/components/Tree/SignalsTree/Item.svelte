<script lang="ts">
import { TreeItem } from '$lib/canvas/TreeItem.svelte';
import { isPaintable } from '$lib/canvas/interfaces';
import type { SwellState } from '$lib/data/SwellState.svelte';
import { getContext } from 'svelte';
import Canvas from './Canvas.svelte';
import Item from './Item.svelte';

const { item }: { item: TreeItem } = $props();

let dirty = $state(false);

$effect(() => {
  item.children;
  item.expanded;
  item.selected;

  dirty = true;
});

$effect(() => {
  if (dirty) {
    item.paintWithChildren();
  }
});

const swellState = getContext<SwellState>('swellState');
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
