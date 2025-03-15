import { devicePixelRatio } from 'svelte/reactivity/window';
import { getCacheFunction } from '$lib/utils/perf';
import type { SwellSettings } from './Settings.svelte';

/** Shared settings for the canvas */
export class SignalCanvas {
  /** Width of the canvas. This changes when the user resizes the canvas. The 1000 default is just so that on first paint, everything is not too blurry. */
  width = $state(1000);

  constructor (private settings: SwellSettings) {}

  /** Because of the devicePixelratio, a single pixel unit is more than 1 pixel on screen. */
  pixelWidth = $derived.by(() => this.width * (devicePixelRatio.current || 1));
  /** @see pixelWidth */
  pixelHeight = $derived.by(() => this.settings.itemHeight * (devicePixelRatio.current || 1));
  /** Based on the current viewLength (in time units), this is the ratio from a pixel to a unit of time. */
  #realPxPerTimeUnit = $derived.by(() => this.pixelWidth / this.settings.getViewLength());
  #fakePxPerTimeUnit = $derived.by(() => this.width / this.settings.getViewLength());

  /** Convert from time to position in the canvas. This uses real pixels, taking into account the device pixel ratio. */
  timeToX = (t: number) => {
    return (t - this.settings.viewStart) * this.#realPxPerTimeUnit;
  };

  /** transform a delta x in time units. This uses browser px, not taking into account the device's pixel ratio. */
  dxToTime = (dx: number) => {
    return dx / this.#fakePxPerTimeUnit;
  };

  /** Convert an x position in the canvas to a time. this uses browser px, not taking into account the device's pixel ratio. */
  xToTime = (x: number) => {
    return this.dxToTime(x) + this.settings.viewStart;
  };

  /** A signal's representation should not draw above this line. */
  getSignalTop = () => {
    return (this.settings.itemPadding / this.settings.itemHeight) * this.pixelHeight;
  };

  /** A signal's representation should not draw below this line. */
  getSignalBottom = () => {
    return ((this.settings.itemHeight - this.settings.itemPadding) / this.settings.itemHeight) * this.pixelHeight;
  };

  static measureTextWidth = getCacheFunction(
    (ctx: CanvasRenderingContext2D, text: string): number => {
      const textMetrics = ctx.measureText(text);
      // see https://developer.mozilla.org/en-US/docs/Web/API/TextMetrics#measuring_text_width
      // return textMetrics.actualBoundingBoxLeft + textMetrics.actualBoundingBoxRight;
      return textMetrics.width;
    },
    (ctx: CanvasRenderingContext2D, text: string) : string => `${ctx.font}-${text}`,
  );
}
