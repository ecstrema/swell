<script lang="ts">
  import { GroupTreeItem } from "$lib/canvas/GroupTreeItem.svelte";
  import { StyledTreeItem } from "$lib/canvas/StyledTreeItem.svelte";
  import type { TreeItem } from "$lib/canvas/TreeItem.svelte";
  import type { Component } from "svelte";
  import Group from "./Group.svelte";
  import Signal from "./Signal.svelte";
  import { config } from "$lib/data/config.svelte";

  const { item }: { item: TreeItem } = $props();

  function getComponent<T extends TreeItem>(
    item: T
  ): Component<{ item: T }> | null {
    if (item instanceof GroupTreeItem) {
      const c: Component<{ item: GroupTreeItem }> = Group;
      // @ts-ignore
      return c;
    } else if (item instanceof StyledTreeItem) {
      const c: Component<{ item: StyledTreeItem }> = Signal;
      // @ts-ignore
      return c;
    } else {
      return null;
    }
  }

  const C = getComponent(item);
</script>

{#if C}
  <div style:padding-left={`${config.treeIndent}px`}>
    <C {item} />
  </div>
{/if}
