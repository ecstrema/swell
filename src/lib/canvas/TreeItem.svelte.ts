export class TreeItem {
  // TODO: any way to move this out of svelte's reactivity system?
  selected = $state(false);
  children: TreeItem[] = $state([]);
  expanded = $state(true);

  hasChildren = () => {
    return this.children.length > 0;
  };

  *iterate(): Generator<TreeItem> {
    yield this;
    for (const child of this.children) {
      yield* child.iterate();
    }
  }

  constructor(
    public name: string,
    children: TreeItem[] = [],
  ) {
    this.children = children;
  }

  toggleSelected = () => {
    this.selected = !this.selected;
  };
}
