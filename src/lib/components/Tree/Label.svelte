<script lang="ts">
import { config } from '$lib/data/config.svelte';

const { children } = $props();
</script>

<div
  class="select-none font-medium"
  style:font-size={`${config.fontSize}px`}
>
  {@render children()}
</div>
