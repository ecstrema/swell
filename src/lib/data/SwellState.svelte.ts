import { Settings } from './Settings.svelte';

export class SwellState {
    config = new Settings()
}

export const swellState = new SwellState();
