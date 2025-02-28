import { SwellSettings } from './Settings.svelte';
import { TempState } from './TempState.svelte';

export class SwellState {
    settings = new SwellSettings()
    temp: TempState

    constructor() {
        this.temp = new TempState(this.settings)
    }
}
