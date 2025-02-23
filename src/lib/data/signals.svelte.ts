import { ClockSignalTreeItem } from "$lib/canvas/ClockSignalTreeItem.svelte";
import { CounterSignalTreeItem } from "$lib/canvas/CounterSignalTreeItem.svelte";
import { GroupTreeItem } from "$lib/canvas/GroupTreeItem.svelte";

export const root = $state(
  new GroupTreeItem("root", [
    new GroupTreeItem("clocks", [
      new ClockSignalTreeItem("01"),
      new ClockSignalTreeItem("0001", 4, 3),
      new ClockSignalTreeItem("1000", 4, 3, 1),
      new ClockSignalTreeItem("1100", 4, 2, 2),
    ]),
    new GroupTreeItem("counters", [
      new CounterSignalTreeItem("01234", 0, 1, 5),
    ]),
  ])
);
