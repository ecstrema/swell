<script lang="ts">
  import * as Collapsible from "$lib/components/ui/collapsible";
  import type { TreeItem } from "$lib/canvas/TreeItem.svelte";
  import Item from "./Item.svelte";
  import Label from "../Label.svelte";
  import { config } from "$lib/data/config.svelte";

  const { item }: { item: TreeItem } = $props();
</script>

{#snippet label()}
  <Label>{item.name}</Label>
{/snippet}

<div style:padding-left={`${config.treeIndent}px`}>
  {#if item.hasChildren()}
    <Collapsible.Root bind:open={item.expanded}>
      <Collapsible.Trigger class="flex items-center w-full">
        <span
          class={item.expanded
            ? "icon-[material-symbols--keyboard-arrow-down-rounded]"
            : "icon-[material-symbols--keyboard-arrow-up-rounded]"}
        ></span>
        {@render label()}
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
