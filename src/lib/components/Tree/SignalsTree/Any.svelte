<script lang="ts">
  import type { TreeItems } from "$lib/data/data.svelte";
  import Group from "./Group.svelte";
  import Signal from "./Signal.svelte";

  const { item }: { item: TreeItems } = $props();

  function getComponent(item: TreeItems) {
    switch (item.type) {
      case "group":
        return Group;
      case "signal":
        return Signal;
      default:
        return null;
    }
  }

  // biome-ignore lint : Seems like svelte doesn't like dynamic components
  const Component: any = getComponent(item);
</script>

{#if Component}
  <Component {item} />
{/if}
