import { bound } from '$lib/math';
import { WaveSettings } from './WaveSettings.svelte';

/** These settings are global settings, not specific to a single simulation */
export class SwellSettings extends WaveSettings {
  itemHeight = $state(26);
  itemPadding = $state(4);
  stripesItemCount = $state(1);
  fontSize = $state(12);
  treeIndent = $state(12);
  lineWidth = $state(1);
  representationPadding = $state(6);
  timelinePixelBetweenTicks = $state(20);
  timelineSecondaryTicksBetweenPrimary = $state(5);
  viewMargin = $state(1);
  minimumViewLength = $state(1);
  scrollFromEdgeMargin = $state(20);
  cursorWidth = $state(2);
  cursorColor = $state('#AAA4');

  getViewMax = () => {
    return this.simulationEnd + this.viewMargin;
  };

  getViewMin = () => {
    return this.simulationStart - this.viewMargin;
  };

  scrollViewStartTo(time: number) {
    const newViewStart = bound(time, this.getViewMin(), this.viewStart + this.viewMargin);
    const delta = newViewStart - this.viewStart;
    this.viewStart += delta;
    this.viewEnd += delta;
  }

  scrollBy = (delta: number) => {
    if (delta > 0 && this.viewEnd + delta > this.getViewMax()) {
      this.viewEnd = this.getViewMax();
      return;
    }
    if (delta < 0 && this.viewStart + delta < this.getViewMin()) {
      this.viewStart = this.getViewMin();
      return;
    }

    this.viewStart = this.viewStart + delta;
    this.viewEnd = this.viewEnd + delta;
  };
}
