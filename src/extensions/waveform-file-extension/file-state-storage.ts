// File state persistence (moved from src/utils)
// Uses `persisted-store` for cross-platform storage (localStorage on web, LazyStore on Tauri)

import { Store } from '../../utils/persisted-store.js';

export interface ItemSignal {
    _type: 'signal';
    ref: number;
    name: string;
    path?: string;
    showFullPath?: boolean;
    format?: 'clock' | 'binary' | 'hex' | 'ascii' | 'decimal';
    color?: string;
}

export interface ItemTimeline { _type: 'timeline'; name?: string; }
export interface ItemMinimap { _type: 'minimap'; name?: string; }
export interface ItemGroup { _type: 'group'; name: string; items: Item[]; collapsed: boolean; }
export type Item = ItemSignal | ItemTimeline | ItemMinimap | ItemGroup;

export interface FileState {
    version: 'V0';
    items: Item[];
    visibleStart: number;
    visibleEnd: number;
    timestamp: number;
}

const STORE_NAME = 'swell-file-states';

function getFileKey(fileId: string): string {
    return fileId.replace(/\\/g, '/');
}

let storeInstance: any | null = null;
async function getStoreInstance() {
    if (storeInstance) return storeInstance;
    storeInstance = new Store(STORE_NAME);
    if (typeof storeInstance.init === 'function') await storeInstance.init();
    return storeInstance;
}

export async function saveFileState(fileId: string, state: FileState): Promise<void> {
    try {
        const fileKey = getFileKey(fileId);
        state.timestamp = Date.now();
        const s = await getStoreInstance();
        await s.set(fileKey, state);
    } catch (e) {
        console.error(`Failed to save state for file ${fileId}:`, e);
    }
}

export async function loadFileState(fileId: string): Promise<FileState | null> {
    try {
        const fileKey = getFileKey(fileId);
        const s = await getStoreInstance();
        const res = await s.get(fileKey) as FileState | undefined;
        return res || null;
    } catch (e) {
        console.error(`Failed to load state for file ${fileId}:`, e);
        return null;
    }
}

export async function removeFileState(fileId: string): Promise<void> {
    try {
        const fileKey = getFileKey(fileId);
        const s = await getStoreInstance();
        await s.delete(fileKey);
    } catch (e) {
        console.error(`Failed to remove state for file ${fileId}:`, e);
    }
}

export async function clearAllFileStates(): Promise<void> {
    try {
        const s = await getStoreInstance();
        await s.clear();
    } catch (e) {
        console.error('Failed to clear all file states:', e);
    }
}
