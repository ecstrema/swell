import type { TreeItems } from "$lib/data/signals.svelte";
import { TreeItem } from "./TreeItem.svelte";

export class GroupTreeItem extends TreeItem {
  type = "group" as const;
  children: TreeItems[] = $state([]);
  expanded = $state(true);

  constructor(name: string, children: TreeItems[] = []) {
    super(name);
    this.children = children;
  }
}
