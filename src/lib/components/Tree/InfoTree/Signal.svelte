<script lang="ts">
  import type { SignalTreeItem } from "$lib/data/data.svelte";
  import Label from "../Label.svelte";

  const { item }: { item: SignalTreeItem } = $props();
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
