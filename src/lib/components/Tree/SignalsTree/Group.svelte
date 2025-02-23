<script lang="ts">
  import type { GroupTreeItem } from "$lib/canvas/GroupTreeItem.svelte";
  import Any from "./Any.svelte";
  import Label from "../Label.svelte";
  import Timeline from "./Timeline.svelte";

  const { item, root = false }: { item: GroupTreeItem; root?: boolean } =
    $props();
</script>

{#if root}
  <Timeline />
{:else}
  <!-- TODO: give useful info -->
  <Label>{""}</Label>
{/if}
{#if item.expanded}
  {#each item.children as child}
    <Any item={child} />
  {/each}
{/if}
