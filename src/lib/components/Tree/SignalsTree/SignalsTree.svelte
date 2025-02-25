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

    if (e.key === "ArrowLeft") {
      config.scrollBy(-absScrollAmount);
    } else if (e.key === "ArrowRight") {
      config.scrollBy(absScrollAmount);
    }
  }

  function dragStart(e: MouseEvent) {
    dragging = true;

    const startX = e.clientX;
    const startViewStart = config.viewStart.value;

    function dragMove(e: MouseEvent) {
      config.scrollViewStartTo(startViewStart - signalCanvas.dxToTime(e.clientX - startX));
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
      config.scrollBy(signalCanvas.dxToTime(e.deltaY));
    } else {
      const previousViewLength = config.getViewLength();
      const viewLength = bound(
        previousViewLength * 1.1 ** (e.deltaY / 100),
        config.minimumViewLength,
        config.simulationLength + config.viewMargin * 2
      );

      const zoomFactor = viewLength / previousViewLength;
      const centerTime = signalCanvas.xToTime(e.offsetX);

      const zoomedViewStart = centerTime - (centerTime - config.viewStart.animationTarget) * zoomFactor;
      const pannedViewStart = zoomedViewStart + e.deltaX / signalCanvas.pixelsPerTimeUnit

      config.viewStart.value = bound(
        pannedViewStart,
        -config.viewMargin,
        config.simulationEnd - viewLength + config.viewMargin
      );

      config.viewEnd.value = config.viewStart.value + viewLength;
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
  aria-valuenow={config.viewStart.animationTarget}
  aria-valuemin={config.simulationStart - config.viewMargin}
  aria-valuemax={config.simulationEnd - config.getViewLength() + config.viewMargin}
  tabindex="0"
>
  <Item item={root} />
</div>
