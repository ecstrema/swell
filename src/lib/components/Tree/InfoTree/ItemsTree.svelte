<script lang="ts">
  import { config } from "$lib/data/config.svelte";
  import { root } from "$lib/data/signals.svelte";
  import Group from "./Group.svelte";
</script>

<div
  style:--stripes-height={config.itemHeight + "px"}
  style:--stripes-item-count={config.stripesItemCount}
  class="stripes"
>
  <Group item={root} root={true} />
</div>
