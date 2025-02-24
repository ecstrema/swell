import { devicePixelRatio } from "svelte/reactivity/window";
import { config } from "$lib/data/config.svelte";

export class SignalCanvas {
  /** Whether the canvas should be repaint during the next frame. */
  dirty = $state(false);

  /** Width of the canvas. This changes when the user resizes the canvas. The 1000 default is just so that on first paint, everything is not too blurry. */
  width = $state(1000);

  /** Because of the devicePixelratio, a single pixel unit is more than 1 pixel on screen. */
  pixelWidth = $derived.by(() => this.width * (devicePixelRatio.current || 1));
  /** @see pixelWidth */
  pixelHeight = $derived.by(
    () => config.itemHeight * (devicePixelRatio.current || 1)
  );
  /** Based on config.viewWidth, this is the ratio from a pixel to a unit of time. */
  pixelsPerTimeUnit = $derived.by(() => this.pixelWidth / config.viewLength);

  /** Convert from time to position in the canvas. */
  timeToX = (t: number) => {
    return (t - config.viewStart) * this.pixelsPerTimeUnit;
  };

  dxToTime = (dx: number) => {
    return dx / this.pixelsPerTimeUnit;
  }

  xToTime = (x: number) => {
    return this.dxToTime(x) + config.viewStart;
  }

  /** A signal's representation should not draw above this line. */
  getSignalTop = () => {
    return (config.itemPadding / config.itemHeight) * this.pixelHeight;
  };

  /** A signal's representation should not draw below this line. */
  getSignalBottom = () => {
    return (
      ((config.itemHeight - config.itemPadding) / config.itemHeight) *
      this.pixelHeight
    );
  };
}

export const signalCanvas = new SignalCanvas();
