import { ClockSignalTreeItem } from '$lib/canvas/ClockSignalTreeItem';
import { CounterSignalTreeItem } from '$lib/canvas/CounterSignalTreeItem';
import { TimelineTreeItem } from '$lib/canvas/TimelineTreeItem.svelte';
import { TreeItem } from '$lib/canvas/TreeItem.svelte';

export const root = $state(new TimelineTreeItem('filename', [new TreeItem('clocks', [new ClockSignalTreeItem('01'), new ClockSignalTreeItem('0001', 4, 3), new ClockSignalTreeItem('1000', 4, 3, 1), new ClockSignalTreeItem('1100', 4, 2, 2)]), new TreeItem('counters', [new CounterSignalTreeItem('01234', 0, 1, 5)])]));
