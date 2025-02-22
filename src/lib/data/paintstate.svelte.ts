import { devicePixelRatio } from "svelte/reactivity/window";
import { config } from "./config.svelte";

export class PaintState {
  dirty = $state(false);
  width = $state(100);
  pixelWidth = $derived.by(() => this.width * (devicePixelRatio.current || 1));
  pixelHeight = $derived.by(
    () => config.itemHeight * (devicePixelRatio.current || 1)
  );
  pixelsPerSecond = $derived.by(() => this.pixelWidth / config.viewWidth);
}

export const paintState = new PaintState();
