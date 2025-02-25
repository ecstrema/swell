<script lang="ts">
  import { swellState } from "$lib/data/SwellState.svelte";

const { children } = $props();
</script>

<div
  class="select-none font-medium"
  style:font-size={`${swellState.config.fontSize}px`}
>
  {@render children()}
</div>
