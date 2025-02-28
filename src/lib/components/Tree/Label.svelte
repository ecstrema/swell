<script lang="ts">
import { SwellState } from '$lib/data/SwellState.svelte';
import { getContext } from 'svelte';

const { children } = $props();

const swellState = getContext<SwellState>('swellState');
</script>

<div
  class="select-none font-medium"
  style:font-size={`${swellState.settings.fontSize}px`}
>
  {@render children()}
</div>
