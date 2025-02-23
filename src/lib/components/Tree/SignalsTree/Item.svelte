<script lang="ts">
  import { isPaintable } from "$lib/canvas/interfaces";
  import type { TreeItem } from "$lib/canvas/TreeItem.svelte";
  import Canvas from "./Canvas.svelte";
  import Item from "./Item.svelte";

  const { item }: { item: TreeItem } = $props();

</script>

{#if isPaintable(item)}
 <Canvas paint={item.paint} />
{/if}

{#if item.expanded}
  {#each item.children as child}
    <Item item={child} />
  {/each}
{/if}
