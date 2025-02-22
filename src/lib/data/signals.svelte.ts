import { ClockSignalTreeItem } from "$lib/signals/ClockSignalTreeItem.svelte";
import { CounterSignalTreeItem } from "$lib/signals/CounterSignalTreeItem.svelte";
import { GroupTreeItem } from "$lib/signals/GroupTreeItem.svelte";
import type { SignalTreeItem } from "$lib/signals/SignalTreeItem.svelte";

export type ValueChange = [number, number];

export type TreeItems = GroupTreeItem | SignalTreeItem;

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
