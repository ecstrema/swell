<script lang="ts">
import { cn } from '$lib/utils.js';
import type * as ResizablePrimitive from 'paneforge';

const {
  ref = $bindable(null),
  this: paneGroup = $bindable(),
  class: className,
  ...restProps
}: ResizablePrimitive.PaneGroupProps & {
  this?: ResizablePrimitive.PaneGroup;
} = $props();
</script>

<ResizablePrimitive.PaneGroup
	bind:this={paneGroup}
	class={cn("flex h-full w-full data-[direction=vertical]:flex-col", className)}
	{...restProps}
/>
