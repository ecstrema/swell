<script lang="ts">
  import type { TreeItem } from '$lib/canvas/TreeItem.svelte';
  import { getContext } from 'svelte';
  import Item from './Item.svelte';
  import type { SwellState } from '$lib/data/SwellState.svelte';

const { root } : { root: TreeItem } = $props();

const swellState = getContext<SwellState>('swellState');

const config = swellState.settings;
</script>

<div
  style:--stripes-height={config.itemHeight + "px"}
  style:--stripes-item-count={config.stripesItemCount}
  class="stripes"
>
  <Item item={root} />
</div>
