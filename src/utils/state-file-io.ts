// State file I/O utilities for saving and loading .swellstate files
// These functions handle the serialization and I/O for explicit state file operations

import { FileState } from './file-state-storage.js';
import { saveStateFileDialog, openStateFileDialog, writeTextFile, readTextFile, isTauri } from '../backend.js';

/**
 * Current state file format version
 * Used for versioning the .swellstate file format
 */
export const CURRENT_STATE_VERSION = 'V0.1';

/**
 * Interface for the complete application state that can be saved to a file
 */
export interface AppState {
    version: string;
    filename: string;
    state: FileState;
}

/**
 * Save the current state to a .swellstate file
 * @param filename - The waveform filename
 * @param state - The file state to save
 */
export async function saveStateToFile(filename: string, state: FileState): Promise<void> {
    // Create a default name based on the waveform filename
    const baseName = filename.replace(/\.[^/.]+$/, ''); // Remove extension
    const defaultName = `${baseName}.swellstate`;
    
    // Open save dialog
    const savePath = await saveStateFileDialog(defaultName);
    if (!savePath) {
        console.log('Save cancelled by user');
        return;
    }
    
    // Create the app state object
    const appState: AppState = {
        version: CURRENT_STATE_VERSION,
        filename: filename,
        state: state
    };
    
    // Serialize to JSON
    const content = JSON.stringify(appState, null, 2);
    
    // Write to file
    await writeTextFile(savePath, content);
    console.log(`State saved to: ${savePath}`);
}

/**
 * Load state from a .swellstate file
 * @returns The loaded state or null if cancelled/failed
 */
export async function loadStateFromFile(): Promise<{ filename: string; state: FileState } | null> {
    // Open file dialog
    const fileOrPath = await openStateFileDialog();
    if (!fileOrPath) {
        console.log('Load cancelled by user');
        return null;
    }
    
    try {
        // Read file content
        const content = await readTextFile(fileOrPath);
        
        // Parse JSON
        const appState: AppState = JSON.parse(content);
        
        // Validate version
        if (appState.version !== CURRENT_STATE_VERSION) {
            console.warn(`Unknown state file version: ${appState.version} (expected ${CURRENT_STATE_VERSION})`);
        }
        
        // Validate required fields
        if (!appState.filename || !appState.state) {
            throw new Error('Invalid state file format: missing required fields');
        }
        
        console.log(`State loaded from file for: ${appState.filename}`);
        return {
            filename: appState.filename,
            state: appState.state
        };
    } catch (e) {
        console.error('Failed to load state file:', e);
        throw e;
    }
}
