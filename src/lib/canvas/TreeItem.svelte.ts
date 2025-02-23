export class TreeItem {
  selected = $state(false);
  constructor(public name: string) {}

  toggleSelected = () => {
    this.selected = !this.selected;
  };
}
