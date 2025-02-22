<script lang="ts">
  import * as Collapsible from "$lib/components/ui/collapsible";

  import type { GroupTreeItem } from "$lib/signals/GroupTreeItem.svelte";
  import Any from "./Any.svelte";
  import Label from "../Label.svelte";

  const { item, root = false }: { item: GroupTreeItem; root?: boolean } =
    $props();
</script>

{#snippet childList()}
  {#each item.children as child}
    <Any item={child} />
  {/each}
{/snippet}

{#if root}
  <Label>{""}</Label>
  {@render childList()}
{:else}
  <Collapsible.Root bind:open={item.expanded}>
    <Collapsible.Trigger class="flex items-center w-full">
      <span
        class={item.expanded
          ? "icon-[material-symbols--keyboard-arrow-down-rounded]"
          : "icon-[material-symbols--keyboard-arrow-up-rounded]"}
      ></span>
      <Label>{item.name}</Label>
    </Collapsible.Trigger>
    <Collapsible.Content>
      {@render childList()}
    </Collapsible.Content>
  </Collapsible.Root>
{/if}
