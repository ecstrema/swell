import { TreeItem } from "./TreeItem.svelte";

export class GroupTreeItem extends TreeItem {
  children: TreeItem[] = $state([]);
  expanded = $state(true);

  constructor(name: string, children: TreeItem[] = []) {
    super(name);
    this.children = children;
  }
}
