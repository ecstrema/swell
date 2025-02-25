export type ValueChange = [number, number];
export type ChangesGenerator = (start: number) => Generator<ValueChange>;

export interface Paintable {
  ctx: CanvasRenderingContext2D | undefined;
  paint: () => void;
}

export function isPaintable(t: unknown): t is Paintable {
  return (t as Paintable).paint !== undefined;
}

export interface LocalValued {
  getValue: (time: number) => number;
}

export interface Signal extends LocalValued {
  getChanges: (start: number) => Generator<ValueChange>;
}
