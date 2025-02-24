<script lang="ts">
  import { onMount } from "svelte";
  import { mode } from "mode-watcher";

  import { root } from "$lib/data/signals.svelte";
  import { Config, config } from "$lib/data/config.svelte";
  import { signalCanvas } from "$lib/data/signalCanvas.svelte";
  import { bound } from "$lib/math";
  import Item from "./Item.svelte";

  let dragging = $state(false);

  function keyDown(e: KeyboardEvent) {
    let absScrollAmount = signalCanvas.dxToTime(signalCanvas.pixelWidth / 10);

    let scrollAmount;
    if (e.key === "ArrowLeft") {
      scrollAmount = -absScrollAmount;
    } else if (e.key === "ArrowRight") {
      scrollAmount = absScrollAmount;
    } else {
      return;
    }

    config.viewStart = bound(
      config.viewStart + scrollAmount,
      -config.viewMargin,
      config.simulationEnd - config.viewLength + config.viewMargin
    );
  }

  function dragStart(e: MouseEvent) {
    dragging = true;

    const startX = e.clientX;
    const startViewStart = config.viewStart;

    function dragMove(e: MouseEvent) {
      config.viewStart = bound(
        startViewStart - (e.clientX - startX) / signalCanvas.pixelsPerTimeUnit,
        -config.viewMargin,
        config.simulationEnd - config.viewLength + config.viewMargin
      );
    }

    function dragEnd() {
      dragging = false;
      window.removeEventListener("mousemove", dragMove);
      window.removeEventListener("mouseup", dragEnd);
    }

    window.addEventListener("mousemove", dragMove);
    window.addEventListener("mouseup", dragEnd);
  }


  function updateView(e: WheelEvent) {
    if (e.shiftKey) {
      config.viewStart = bound(
        config.viewStart + e.deltaY / signalCanvas.pixelsPerTimeUnit,
        -config.viewMargin,
        config.simulationEnd - config.viewLength + config.viewMargin
      );
    } else {
      const previousViewLength = config.viewLength;
      config.viewLength = bound(
        config.viewLength * 1.1 ** (e.deltaY / 100),
        config.minimumViewLength,
        config.simulationLength + config.viewMargin * 2
      );

      const zoomFactor = config.viewLength / previousViewLength;
      const centerTime = signalCanvas.xToTime(e.offsetX);

      const zoomedViewStart = centerTime - (centerTime - config.viewStart) * zoomFactor;
      const pannedViewStart = zoomedViewStart + e.deltaX / signalCanvas.pixelsPerTimeUnit

      config.viewStart = bound(
        pannedViewStart,
        -config.viewMargin,
        config.simulationEnd - config.viewLength + config.viewMargin
      );
    }

    e.preventDefault();
    e.stopPropagation();
  }

  onMount(() => {
    mode.subscribe(() => {
      signalCanvas.dirty = true;
    });
  });

  $effect(() => {
    for (const key of Object.getOwnPropertyNames(Config.prototype)) {
      const _ = config[key as keyof Config];
    }
    signalCanvas.dirty = true;
  });
</script>

<div
  style:--stripes-height={config.itemHeight + "px"}
  class="stripes"
  onwheel={(e) => updateView(e)}
  onmousedown={(e) => dragStart(e)}
  onkeydown={(e) => keyDown(e)}
  role="scrollbar"
  aria-controls="signals"
  aria-valuenow={config.viewStart}
  aria-valuemin={config.simulationStart - config.viewMargin}
  aria-valuemax={config.simulationEnd - config.viewLength + config.viewMargin}
  tabindex="0"
>
  <Item item={root} />
</div>
