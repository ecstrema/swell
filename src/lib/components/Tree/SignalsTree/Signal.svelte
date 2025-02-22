<script lang="ts">
  import type { SignalTreeItem } from "$lib/data/data.svelte";
  import Canvas from "./Canvas.svelte";

  const { item }: { item: SignalTreeItem } = $props();
</script>

<Canvas paint={item.paint} />
