<script lang="ts">
  import type { CanvasTreeItem } from "$lib/canvas/interfaces";
  import Canvas from "./Canvas.svelte";

  const { item }: { item: CanvasTreeItem } = $props();
</script>

<Canvas paint={item.paint} />
