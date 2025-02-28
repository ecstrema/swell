import type { SwellState } from '$lib/data/SwellState.svelte';

export type SignalValue = number | bigint | boolean | null;
export type ValueChange<T extends SignalValue = SignalValue> = [number, T];

/**
 * A changes generator should always start from the last change before start.
 *
 * If there are none, it should yield a null at start before continuing with its updates.
 *
 * If it doesn't does not have changes anymore, it should return.
 */
export type ChangesGenerator<T extends SignalValue = SignalValue> = (start: number) => Generator<ValueChange<T>>;


export interface PainterProps {
  ctx: CanvasRenderingContext2D;
  changes?: ChangesGenerator;
  state: SwellState;
}

export type Painter = (props: PainterProps) => void;

export interface Paintable {
  paint: Painter;
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
