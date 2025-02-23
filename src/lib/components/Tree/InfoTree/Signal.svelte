<script lang="ts">
  import type { StyledTreeItem } from "$lib/canvas/StyledTreeItem";
  import Label from "../Label.svelte";

  const { item }: { item: StyledTreeItem } = $props();
</script>

<Label>
  <button
    class="flex items-center w-full"
    class:font-bold={item.selected}
    onclick={item.toggleSelected}
  >
    <span class="icon-[material-symbols--airwave-rounded]"></span>
    <span>{item.name}</span>
  </button>
</Label>
