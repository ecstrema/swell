<script lang="ts">
import { getTimelinePainter } from '$lib/canvas/TimelineTreeItem';
import { TreeItem } from '$lib/canvas/TreeItem.svelte';
import ItemsTree from '$lib/components/Tree/InfoTree/InfoTree.svelte';
import SignalsTree from '$lib/components/Tree/SignalsTree/SignalsTree.svelte';
import * as Resizable from '$lib/components/ui/resizable/index.js';
import { SwellState } from '$lib/data/SwellState.svelte';
  import { setContext } from 'svelte';

const swellState = new SwellState();

// biome-ignore format:
export const root = $state(
  new TreeItem({name: "filename", state: swellState, painter: getTimelinePainter(swellState), children: [

  ]})
  // new TimelineTreeItem("filename", [
  //   new TreeItem("clocks", [
  //     new ClockSignalTreeItem("01"),
  //     new ClockSignalTreeItem("0001", 4, 3),
  //     new ClockSignalTreeItem("1000", 4, 3, 1),
  //     new ClockSignalTreeItem("1100", 4, 2, 2),
  //     new ClockSignalTreeItem("01"),
  //     new ClockSignalTreeItem("0001", 4, 3),
  //     new ClockSignalTreeItem("1000", 4, 3, 1),
  //     new ClockSignalTreeItem("1100", 4, 2, 2),
  //   ]),
  //   new TreeItem("counters", [
  //     new CounterSignalTreeItem("01234", 0, 1, 5),
  //   ]),
  // ])
);

setContext("swellState", swellState);
</script>

<Resizable.PaneGroup autoSaveId="swell" direction="horizontal" class="h-full">
  <Resizable.Pane defaultSize={30} class="min-w-32">
    <ItemsTree {root}/>
  </Resizable.Pane>

  <Resizable.Handle />

  <Resizable.Pane>
    <SignalsTree {root}/>
  </Resizable.Pane>
</Resizable.PaneGroup>
