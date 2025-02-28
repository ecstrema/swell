<script lang="ts">
import { TreeItem } from '$lib/canvas/TreeItem.svelte';
import * as Collapsible from '$lib/components/ui/collapsible';
import { SwellState } from '$lib/data/SwellState.svelte';
  import { getContext } from 'svelte';
import Label from '../Label.svelte';
import Item from './Item.svelte';

const { item }: { item: TreeItem } = $props();

const swellState = getContext<SwellState>('swellState');
const swellSettings = swellState.settings;
</script>

{#snippet label()}
  <div class="flex items-center w-full" style:height={`${swellSettings.itemHeight}px`}>
    <Label>{item.name}</Label>
  </div>
{/snippet}

<div style:padding-left={`${swellSettings.treeIndent}px`}>
  {#if item.hasChildren()}
    <Collapsible.Root bind:open={item.expanded}>
      <Collapsible.Trigger>
        <div
          class="flex items-center w-full"
          style:height={`${swellSettings.itemHeight}px`}
        >
          <span
            class={item.expanded
              ? "icon-[material-symbols--keyboard-arrow-down-rounded]"
              : "icon-[material-symbols--keyboard-arrow-up-rounded]"}
          ></span>
          {@render label()}
        </div>
      </Collapsible.Trigger>
      <Collapsible.Content>
        {#each item.children as child}
          <Item item={child} />
        {/each}
      </Collapsible.Content>
    </Collapsible.Root>
  {:else}
    {@render label()}
  {/if}
</div>
