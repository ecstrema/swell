// File session persistence for web using IndexedDB
// This allows files to be restored when the page is refreshed

import { isTauri } from '../backend.js';

const DB_NAME = 'swell-file-session';
const DB_VERSION = 1;
const STORE_NAME = 'files';

interface StoredFile {
    name: string;
    data: Uint8Array;
    timestamp: number;
}

/**
 * Open the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'name' });
            }
        };
    });
}

/**
 * Save a file to IndexedDB
 */
export async function saveFileToSession(name: string, data: Uint8Array): Promise<void> {
    if (isTauri) {
        // Tauri handles file persistence differently
        return;
    }
    
    try {
        const db = await openDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const storedFile: StoredFile = {
            name,
            data,
            timestamp: Date.now()
        };
        
        store.put(storedFile);
        
        await new Promise<void>((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
        
        db.close();
    } catch (e) {
        console.error('Failed to save file to session:', e);
    }
}

/**
 * Remove a file from IndexedDB
 */
export async function removeFileFromSession(name: string): Promise<void> {
    if (isTauri) {
        return;
    }
    
    try {
        const db = await openDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        store.delete(name);
        
        await new Promise<void>((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
        
        db.close();
    } catch (e) {
        console.error('Failed to remove file from session:', e);
    }
}

/**
 * Get all files from IndexedDB
 */
export async function getSessionFiles(): Promise<StoredFile[]> {
    if (isTauri) {
        // Tauri handles file persistence differently
        return [];
    }
    
    try {
        const db = await openDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.getAll();
        
        const files = await new Promise<StoredFile[]>((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        
        db.close();
        return files;
    } catch (e) {
        console.error('Failed to get session files:', e);
        return [];
    }
}

/**
 * Clear all files from IndexedDB
 */
export async function clearSession(): Promise<void> {
    if (isTauri) {
        return;
    }
    
    try {
        const db = await openDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        store.clear();
        
        await new Promise<void>((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
        
        db.close();
    } catch (e) {
        console.error('Failed to clear session:', e);
    }
}
