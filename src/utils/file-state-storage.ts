// File state persistence for restoring per-file settings like selected signals and visible range
// This allows the application to restore the exact state when reopening a file

import { isTauri } from '../backend/index.js';
import { getSetting, setSetting } from '../settings/settings-storage.js';

/**
 * Item representing a signal in the waveform display
 */
export interface ItemSignal {
    _type: 'signal';
    ref: number;
    name: string;
    path?: string; // Full hierarchical path
    showFullPath?: boolean; // Whether to display the full path or just the name
    format?: 'clock' | 'binary' | 'hex' | 'ascii' | 'decimal';
    color?: string;
}

/**
 * Item representing a timeline in the waveform display
 */
export interface ItemTimeline {
    _type: 'timeline';
    name?: string;
}

/**
 * Item representing a minimap in the waveform display
 */
export interface ItemMinimap {
    _type: 'minimap';
    name?: string;
}

/**
 * Item representing a collapsible group of items
 */
export interface ItemGroup {
    _type: 'group';
    name: string;
    items: Item[];
    collapsed: boolean;
}

/**
 * Union type for all possible items in the display
 */
export type Item = ItemSignal | ItemTimeline | ItemMinimap | ItemGroup;

/**
 * State information for a single file that should be persisted
 */
export interface FileState {
    /** Version identifier for state format */
    version: 'V0.1';
    /** Hierarchical list of items (signals, timelines, groups) */
    items: Item[];
    /** Visible start time */
    visibleStart: number;
    /** Visible end time */
    visibleEnd: number;
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
