<script lang="ts">
import { cn } from '$lib/utils.js';
import type { Accordion as AccordionPrimitive, WithoutChild } from 'bits-ui';

const { ref = $bindable(null), class: className, children, ...restProps }: WithoutChild<AccordionPrimitive.ContentProps> = $props();
</script>

<AccordionPrimitive.Content
	bind:ref
	class={cn(
		"data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm transition-all",
		className
	)}
	{...restProps}
>
	<div class="pb-4 pt-0">
		{@render children?.()}
	</div>
</AccordionPrimitive.Content>
