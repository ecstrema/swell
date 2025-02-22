<script lang="ts">
  import { config } from "$lib/data/config.svelte";

  const { children } = $props();
</script>

<div
  class="select-none"
  style:font-size={`${config.treeFontSize}px`}
  style:height={`${config.itemHeight}px`}
>
  {@render children()}
</div>
