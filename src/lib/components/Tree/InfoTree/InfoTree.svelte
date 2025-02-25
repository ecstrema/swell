<script lang="ts">
  import type { TreeItem } from '$lib/canvas/TreeItem.svelte';
import { swellState } from '$lib/data/SwellState.svelte';
import Item from './Item.svelte';

const { root } : { root: TreeItem } = $props();

const config = $derived.by(() => swellState.config);
</script>

<div
  style:--stripes-height={config.itemHeight + "px"}
  style:--stripes-item-count={config.stripesItemCount}
  class="stripes"
>
  <Item item={root} />
</div>
