<script lang="ts">

  import type { SignalTreeItem } from "$lib/signals/SignalTreeItem.svelte";
  import Canvas from "./Canvas.svelte";

  const { item }: { item: SignalTreeItem } = $props();
</script>

<Canvas paint={item.paint} />
