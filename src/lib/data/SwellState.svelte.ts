import { Settings } from './Settings.svelte';
import { TempState } from './TempState.svelte';

export class SwellState {
    config = new Settings()
    temp = new TempState()
}

export const swellState = new SwellState();
