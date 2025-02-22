<script lang="ts">
  import * as Resizable from "$lib/components/ui/resizable/index.js";
  import ItemsTree from "$lib/components/Tree/InfoTree/Group.svelte";
  import SignalsTree from "$lib/components/Tree/SignalsTree/Group.svelte";
  import { root } from "$lib/data/data.svelte";
  import { config } from "$lib/data/config.svelte";
</script>

<Resizable.PaneGroup autoSaveId="swell" direction="horizontal" class="h-full">
  <Resizable.Pane defaultSize={30} class="min-w-32">
    <div
      style:--stripes-height={config.itemHeight + "px"}
      style:--stripes-item-count={config.stripesItemCount}
      class="stripes"
    >
      <ItemsTree item={root} root={true}/>
    </div>
  </Resizable.Pane>

  <Resizable.Handle withHandle={true}/>

  <Resizable.Pane>
    <div
      style:--stripes-height={config.itemHeight + "px"}
      class="stripes"
    >
      <SignalsTree item={root} root={true}/>
    </div>
  </Resizable.Pane>
</Resizable.PaneGroup>

<style>
  .stripes {
    background: linear-gradient(
      to bottom,
      hsl(var(--background)),
      hsl(var(--background)) 50%,
      color-mix(in srgb, hsl(var(--background)), white 5%) 50%,
      color-mix(in srgb, hsl(var(--background)), white 5%)
    );
    background-size: 100% calc(var(--stripes-item-count, 1) * 2 * var(--stripes-height));
  }
</style>
