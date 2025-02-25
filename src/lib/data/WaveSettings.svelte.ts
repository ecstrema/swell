/** These settings are specific to a single waveform */
export class WaveSettings {
  timeUnit : 'min' | 's' | 'ms' | 'us' | 'ns' | 'fs' = $state('ns');
  viewStart = $state(0);
  viewEnd = $state(100);

  simulationStart = $state(0);
  simulationEnd = $state(10_000);

  getSimulationLength() {
    return this.simulationStart + this.simulationEnd;
  }

  getViewLength = () => {
    return this.viewEnd - this.viewStart;
  };

  getDrawStart = () => {
    return Math.max(this.simulationStart, this.viewStart);
  };

  getDrawEnd = () => {
    return Math.min(this.simulationEnd, this.viewEnd);
  };
}
