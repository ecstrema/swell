import { AnimatedState, getAnimate } from '$lib/animate.svelte';
import { bound } from '$lib/math';
import { cubicIn } from 'svelte/easing';

export class Config {
  itemHeight = 26;
  itemPadding = 4;
  stripesItemCount = 1;
  fontSize = 12;
  treeIndent = 12;
  lineWidth = 1;
  representationPadding = 6;
  timelinePixelBetweenTicks = 20;
  timelineSecondaryTicksBetweenPrimary = 5;

  timeUnit : 'min' | 's' | 'ms' | 'us' | 'ns' | 'fs' = 'ns';

  viewMargin = 1;

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
    console.log(delta);
    if (delta > 0 && this.viewEnd.valueTarget + delta > this.getViewMax()) {
      this.viewEnd.value = this.getViewMax();
      return;
    }
    if (delta < 0 && this.viewStart.valueTarget + delta < this.getViewMin()) {
      this.viewStart.value = this.getViewMin();
      return;
    }

    this.viewStart.value = this.viewStart.valueTarget + delta;
    this.viewEnd.value = this.viewEnd.valueTarget + delta;
  };

  getViewLength = () => {
    return this.viewEnd.value - this.viewStart.value;
  };

  minimumViewLength = 2;

  simulationStart = 0;
  simulationLength = 10_000;
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

export const config = $state(new Config());
