import { SwellSettings } from './Settings.svelte';
import { TempState } from './TempState.svelte';

export class SwellState {
    settings = new SwellSettings()
    temp = new TempState()
}

export const swellState = new SwellState();
