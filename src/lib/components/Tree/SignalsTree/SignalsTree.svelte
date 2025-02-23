<script lang="ts">
  import Group from "$lib/components/Tree/SignalsTree/Group.svelte";
  import { root } from "$lib/data/signals.svelte";
  import { causesCanvasRepaint, config } from "$lib/data/config.svelte";
  import { signalCanvas } from "$lib/data/signalCanvas.svelte";
  import { onMount } from "svelte";
  import { mode } from "mode-watcher";
  import { bound } from "$lib/math";

  function updateView(e: WheelEvent) {
    config.viewLength = bound(
      config.viewLength * 1.1 ** (e.deltaY / 100),
      config.minimumViewLength,
      config.simulationLength + config.viewMargin * 2
    );
    config.viewStart = bound(
      config.viewStart + e.deltaX / signalCanvas.pixelsPerTimeUnit,
      -config.viewMargin,
      config.simulationEnd - config.viewLength + config.viewMargin
    );
  }

  onMount(() => {
    mode.subscribe(() => {
      signalCanvas.dirty = true;
    });
  });

  $effect(() => {
    for (const key of causesCanvasRepaint) {
      const _ = config[key];
    }
    signalCanvas.dirty = true;
  });
</script>

<div
  style:--stripes-height={config.itemHeight + "px"}
  class="stripes"
  onwheel={(e) => updateView(e)}
>
  <Group item={root} root={true} />
</div>
