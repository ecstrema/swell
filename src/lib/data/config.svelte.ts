import { AnimatedState, getAnimate } from "$lib/animate.svelte";
import { bound } from "$lib/math";
import { cubicIn } from "svelte/easing";

export class Config {
  itemHeight = $state(26);
  itemPadding = $state(4);
  stripesItemCount = $state(1);
  fontSize = $state(12);
  treeIndent = $state(12);
  lineWidth = $state(1);
  representationPadding = $state(6);
  timelinePixelBetweenTicks = $state(20);
  timelineSecondaryTicksBetweenPrimary = $state(5);

  timeUnit = $state<"min" | "s" | "ms" | "us" | "ns" | "fs">("ns");

  viewMargin = $state(1);

  viewStart = new AnimatedState(0, cubicIn, 100);
  viewEnd = new AnimatedState(100, cubicIn, 100);

  getViewMax = () => {
    return this.simulationEnd + this.viewMargin;
  };

  getViewMin = () => {
    return this.simulationStart - this.viewMargin;
  };

  scrollViewStartTo(time: number) {
    const newViewStart = bound(time, this.getViewMin(), this.viewStart.value + this.viewMargin);
    const delta = newViewStart - this.viewStart.value;
    this.viewStart.value += delta;
    this.viewEnd.value += delta;
  }

  scrollBy = (delta: number) => {
    if (delta > 0 && this.viewEnd.value + delta > this.getViewMax()) {
      this.viewEnd.value = this.getViewMax();
      return;
    } else if (delta < 0 && this.viewStart.value + delta < this.getViewMin()) {
      this.viewStart.value = this.getViewMin();
      return;
    }

    this.viewStart.value += delta;
    this.viewEnd.value += delta;
  };

  getViewLength = () => {
    return this.viewEnd.value - this.viewStart.value;
  };

  minimumViewLength = $state(2);

  simulationStart = $state(0);
  simulationLength = $state(10_000);
  get simulationEnd() {
    return this.simulationStart + this.simulationLength;
  }

  getDrawStart = () => {
    return Math.max(config.simulationStart, config.viewStart.value);
  };

  getDrawEnd = () => {
    return Math.min(config.simulationEnd, config.viewEnd.value);
  };
}

export const config = new Config();
