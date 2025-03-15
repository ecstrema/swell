<script lang="ts">
import { mode } from 'mode-watcher';

import { bound } from '$lib/utils/math';
import Item from './Item.svelte';
import { TreeItem } from '$lib/canvas/TreeItem.svelte';
import Cursor from '$lib/components/Cursor.svelte';
import type { SwellState } from '$lib/data/SwellState.svelte';
import { getContext } from 'svelte';

const swellState = getContext<SwellState>('swellState');

const config = swellState.settings;
const signalsCanvas = swellState.temp.signalsCanvas;

const { root }: { root: TreeItem } = $props();

function keyDown(e: KeyboardEvent) {
  const absScrollAmount = signalsCanvas.dxToTime(signalsCanvas.width / 10);

  if (e.key === 'ArrowLeft') {
    config.scrollBy(-absScrollAmount);
  } else if (e.key === 'ArrowRight') {
    config.scrollBy(absScrollAmount);
  }
}

function dragStart(e: MouseEvent) {
  const startX = e.clientX;
  const startViewStart = config.viewStart;

  function dragMove(e: MouseEvent) {
    config.scrollViewStartTo(startViewStart - signalsCanvas.dxToTime(e.clientX - startX));
  }

  function dragEnd() {
    window.removeEventListener('mousemove', dragMove);
    window.removeEventListener('mouseup', dragEnd);
  }

  window.addEventListener('mousemove', dragMove);
  window.addEventListener('mouseup', dragEnd);
}

function updateView(e: WheelEvent) {
  if (e.shiftKey) {
    config.scrollBy(signalsCanvas.dxToTime(e.deltaY));
  } else {
    const previousViewLength = config.getViewLength();
    const viewLength = bound(previousViewLength * 1.1 ** (e.deltaY / 100), config.minimumViewLength, config.getSimulationLength() + config.viewMargin * 2);

    // if we are close to an edge, assume we zoom from this edge.
    const zoomFactor = viewLength / previousViewLength;
    let offsetX = e.offsetX;
    if (offsetX < config.scrollFromEdgeMargin) {
      offsetX = 0;
    } else if (offsetX > signalsCanvas.pixelWidth - config.scrollFromEdgeMargin) {
      offsetX = signalsCanvas.pixelWidth;
    }
    const centerTime = signalsCanvas.xToTime(offsetX);

    const zoomedViewStart = centerTime - (centerTime - config.viewStart) * zoomFactor;
    const pannedViewStart = zoomedViewStart + signalsCanvas.dxToTime(e.deltaX);

    config.viewStart = bound(pannedViewStart, -config.viewMargin, config.simulationEnd - viewLength + config.viewMargin);

    config.viewEnd = config.viewStart + viewLength;
  }

  e.preventDefault();
  e.stopPropagation();
}

let dirty = $state(true);

$effect(() => {
  // List of things that should trigger a repaint;
  config.fontSize;
  config.lineWidth;
  config.representationPadding;
  config.timelinePixelBetweenTicks;
  config.timelineSecondaryTicksBetweenPrimary;
  config.viewMargin;
  config.timeUnit;
  config.viewStart;
  config.viewEnd;
  config.simulationStart;
  config.simulationEnd;

  dirty = true;
});

$effect(() => {
  if (dirty) {
    root.paintWithChildren();
  }
});

mode.subscribe(() => {
  dirty = true;
});
</script>

<div
  style:--stripes-height={config.itemHeight + "px"}
  class="stripes relative"
  onwheel={(e) => updateView(e)}
  onmousedown={(e) => dragStart(e)}
  onkeydown={(e) => keyDown(e)}
  role="scrollbar"
  aria-controls="signals"
  aria-valuenow={config.viewStart}
  aria-valuemin={config.getViewMin()}
  aria-valuemax={config.getViewMax() - config.getViewLength()}
  tabindex="0"
>
  <Cursor />
  <Item item={root} />
</div>
