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

  viewStart = $state(0);
  viewLength = $state(100);
  minimumViewLength = $state(2);
  get viewEnd() {
    return this.viewStart + this.viewLength;
  }

  simulationStart = $state(0);
  simulationLength = $state(10_000);
  get simulationEnd() {
    return this.simulationStart + this.simulationLength;
  }

  getDrawStart = () => {
    return Math.max(config.simulationStart, config.viewStart);
  };

  getDrawEnd = () => {
    return Math.min(config.simulationEnd, config.viewEnd);
  };
}

export const causesCanvasRepaint: (keyof Config)[] = [
  "itemHeight",
  "itemPadding",
  "fontSize",
  "lineWidth",
  "timeUnit",
  "viewStart",
  "viewLength",
  "simulationStart",
  "simulationLength",
];

export const config = new Config();
