// File state persistence for restoring per-file settings like selected signals and visible range
// This allows the application to restore the exact state when reopening a file

import { isTauri } from '../backend.js';
import { getSetting, setSetting } from '../settings/settings-storage.js';

/**
 * State information for a single file that should be persisted
 */
export interface FileState {
    /** List of selected signal references (positive refs for signals, negative for timelines) */
    selectedSignalRefs: number[];
    /** Names of selected signals in order */
    selectedSignalNames: string[];
    /** Visible start time */
    visibleStart: number;
    /** Visible end time */
    visibleEnd: number;
    /** Number of timeline instances */
    timelineCount: number;
    /** Last update timestamp */
    timestamp: number;
}

const FILE_STATE_KEY = 'FileStates';

/**
 * Get a normalized file identifier for storage key
 * To handle files with the same name in different directories,
 * we use the full path but normalize path separators
 */
function getFileKey(fileId: string): string {
    // Normalize path separators to forward slashes for consistency
    return fileId.replace(/\\/g, '/');
}

/**
 * Get all file states from storage
 */
async function getAllFileStates(): Promise<Record<string, FileState>> {
    if (isTauri) {
        try {
            const states = await getSetting(FILE_STATE_KEY);
            return (states as Record<string, FileState>) || {};
        } catch (e) {
            console.error('Failed to get file states from Tauri:', e);
            return {};
        }
    } else {
        // Web mode: use localStorage
        try {
            const statesJson = localStorage.getItem(FILE_STATE_KEY);
            if (statesJson) {
                return JSON.parse(statesJson);
            }
        } catch (e) {
            console.error('Failed to get file states from localStorage:', e);
        }
        return {};
    }
}

/**
 * Save all file states to storage
 */
async function saveAllFileStates(states: Record<string, FileState>): Promise<void> {
    if (isTauri) {
        try {
            await setSetting(FILE_STATE_KEY, states);
        } catch (e) {
            console.error('Failed to save file states to Tauri:', e);
        }
    } else {
        // Web mode: use localStorage
        try {
            localStorage.setItem(FILE_STATE_KEY, JSON.stringify(states));
        } catch (e) {
            console.error('Failed to save file states to localStorage:', e);
        }
    }
}

/**
 * Save the state for a specific file
 */
export async function saveFileState(fileId: string, state: FileState): Promise<void> {
    try {
        const fileKey = getFileKey(fileId);
        const allStates = await getAllFileStates();
        
        // Update timestamp
        state.timestamp = Date.now();
        
        allStates[fileKey] = state;
        await saveAllFileStates(allStates);
    } catch (e) {
        console.error(`Failed to save state for file ${fileId}:`, e);
    }
}

/**
 * Load the state for a specific file
 */
export async function loadFileState(fileId: string): Promise<FileState | null> {
    try {
        const fileKey = getFileKey(fileId);
        const allStates = await getAllFileStates();
        return allStates[fileKey] || null;
    } catch (e) {
        console.error(`Failed to load state for file ${fileId}:`, e);
        return null;
    }
}

/**
 * Remove the state for a specific file
 */
export async function removeFileState(fileId: string): Promise<void> {
    try {
        const fileKey = getFileKey(fileId);
        const allStates = await getAllFileStates();
        delete allStates[fileKey];
        await saveAllFileStates(allStates);
    } catch (e) {
        console.error(`Failed to remove state for file ${fileId}:`, e);
    }
}

/**
 * Clear all file states
 */
export async function clearAllFileStates(): Promise<void> {
    try {
        await saveAllFileStates({});
    } catch (e) {
        console.error('Failed to clear all file states:', e);
    }
}
