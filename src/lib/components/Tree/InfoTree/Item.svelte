<script lang="ts">
import { TreeItem } from '$lib/canvas/TreeItem.svelte';
import * as Collapsible from '$lib/components/ui/collapsible';
import { config } from '$lib/data/config.svelte';
import Label from '../Label.svelte';
import Item from './Item.svelte';

const { item }: { item: TreeItem } = $props();
</script>

{#snippet label()}
  <div class="flex items-center w-full" style:height={`${config.itemHeight}px`}>
    <Label>{item.name}</Label>
  </div>
{/snippet}

<div style:padding-left={`${config.treeIndent}px`}>
  {#if item.hasChildren()}
    <Collapsible.Root bind:open={item.expanded}>
      <Collapsible.Trigger>
        <div
          class="flex items-center w-full"
          style:height={`${config.itemHeight}px`}
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
