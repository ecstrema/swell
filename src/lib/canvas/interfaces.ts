
export type SignalValue = number | bigint | boolean | null;
export type ValueChange<T extends SignalValue = SignalValue> = [number, T];
export type ChangesGenerator<T extends SignalValue = SignalValue> = (start: number) => Generator<ValueChange<T>>;

export interface Paintable {
  ctx: CanvasRenderingContext2D | undefined;
  paint: () => void;
}

export function isPaintable(t: unknown): t is Paintable {
  return (t as Paintable).paint !== undefined;
}

export interface LocalValued {
  getValue: (time: number) => SignalValue;
}

export interface Signal<T extends SignalValue> extends LocalValued {
  getChanges: ChangesGenerator<T>;
}
