export type ValueChange = [number, number];
export type ChangesGenerator = (start: number) => Generator<ValueChange>;

export interface CanvasTreeItem {
  paint: (ctx: CanvasRenderingContext2D) => void;
}

export interface SignalTreeItem {
  getValue: (time: number) => number;
  getChanges: (start: number) => Generator<ValueChange>;
}
