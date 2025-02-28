import type { SwellSettings } from "./Settings.svelte";
import { SignalCanvas } from "./SignalCanvas.svelte";

export class TempState {
  cursorPosition = $state(0);
  signalsCanvas: SignalCanvas;

  constructor(settings: SwellSettings) {
    this.signalsCanvas = new SignalCanvas(settings);
  }
}
