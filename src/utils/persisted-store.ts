// Simple persisted key/value store abstraction
// - Web: backed by IndexedDB (per-store JSON blob)
// - Native (Tauri): backed by plugin-store (LazyStore/Store) when available

import { UnlistenFn } from "@tauri-apps/api/event";
import { isTauri } from "../backend/index.js";
// Note: we previously used LazyStore from @tauri-apps/plugin-store when running
// under Tauri, but the new requirement calls for a unified wrapper around the
// fs API.  LocalStorageStore now handles both platforms directly.

// IndexedDB helpers used by the web-backed store
const PERSIST_DB = 'persisted-store';
const BLOB_STORE = 'blobs';

function openPersistDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(PERSIST_DB, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(BLOB_STORE)) {
                db.createObjectStore(BLOB_STORE);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function idbGetBlob(key: string): Promise<string | undefined> {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await openPersistDb();
            const tx = db.transaction(BLOB_STORE, 'readonly');
            const store = tx.objectStore(BLOB_STORE);
            const r = store.get(key);
            r.onsuccess = () => resolve(r.result as string | undefined);
            r.onerror = () => reject(r.error);
        } catch (e) {
            reject(e);
        }
    });
}

function idbSetBlob(key: string, value: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await openPersistDb();
            const tx = db.transaction(BLOB_STORE, 'readwrite');
            const store = tx.objectStore(BLOB_STORE);
            const r = store.put(value, key);
            r.onsuccess = () => resolve();
            r.onerror = () => reject(r.error);
        } catch (e) {
            reject(e);
        }
    });
}

function idbDeleteBlob(key: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await openPersistDb();
            const tx = db.transaction(BLOB_STORE, 'readwrite');
            const store = tx.objectStore(BLOB_STORE);
            const r = store.delete(key);
            r.onsuccess = () => resolve();
            r.onerror = () => reject(r.error);
        } catch (e) {
            reject(e);
        }
    });
}


// simple key/value store implementation that runs in the browser using
// IndexedDB and, when executed under Tauri, is replaced by the plugin-store
// LazyStore (which itself writes a JSON file to the application directory).
//
// The IDB implementation mirrors the old localStorage behaviour but avoids
// the size limitations and provides async APIs.

class LocalStorageStore {

  private path: string;
  private data: Record<string, any> = {};
  private onChangeCbs = new Set<(all: Record<string, any>) => void>();
  private perKey = new Map<string, Set<(val: any) => void>>();

  constructor(filename: string) {
    this.path = filename;

    // storage events are not available for IDB, so we don't listen here
    this.init();
  }

  reset(): Promise<void> {
    return this.clear();
  }

  onKeyChange<T>(
    key: string,
    cb: (value: T | undefined) => void,
  ): Promise<UnlistenFn> {
    if (!this.perKey.has(key)) this.perKey.set(key, new Set());
    this.perKey.get(key)!.add(cb);
    return Promise.resolve(() => this.perKey.get(key)!.delete(cb));
  }

  onChange<T>(
    cb: (key: string, value: T | undefined) => void,
  ): Promise<UnlistenFn> {
    this.onChangeCbs.add((all) => {
      for (const [k, v] of Object.entries(all)) {
        cb(k, v);
      }
    });
    return Promise.resolve(() => {
      this.onChangeCbs.delete((all) => {
        for (const [k, v] of Object.entries(all)) {
          cb(k, v);
        }
      });
    });
  }

  close(): Promise<void> {
    this.onChangeCbs.clear();
    this.perKey.clear();
    return Promise.resolve();
  }

  async init(): Promise<void> {
    try {
      if (isTauri) {
        // read JSON file from application directory
        const { readAppJSON } = await import('./app-file-storage.js');
        const obj = await readAppJSON(this.path);
        this.data = obj || {};
      } else {
        const raw = await idbGetBlob(this.path);
        if (raw) this.data = JSON.parse(raw);
        else this.data = {};
      }
    } catch (e) {
      console.error("persisted-store: failed to read persisted store:", e);
      this.data = {};
    }
  }

  private persist() {
    try {
      if (isTauri) {
        // write entire blob to file
        import('./app-file-storage.js').then(({ writeAppJSON }) => {
          writeAppJSON(this.path, this.data as any).catch((e) => {
            console.error('persisted-store: failed to write file:', e);
          });
        });
      } else {
        idbSetBlob(this.path, JSON.stringify(this.data));
      }
    } catch (e) {
      console.error("persisted-store: failed to persist:", e);
    }
  }

  async get<T = any>(key: string): Promise<T | undefined> {
    return this.data[key] as T | undefined;
  }
  async set<T = any>(key: string, value: T): Promise<void> {
    this.data[key] = value;
    this.persist();
    this.emitKeyChange(key, value);
    this.emitChange();
  }
  async delete(key: string): Promise<boolean> {
    const existed = key in this.data;
    delete this.data[key];
    this.persist();
    this.emitKeyChange(key, undefined);
    this.emitChange();
    return existed;
  }

  async has(key: string): Promise<boolean> {
    return key in this.data;
  }
  async keys(): Promise<string[]> {
    return Object.keys(this.data);
  }
  async entries(): Promise<[string, any][]> {
    return Object.entries(this.data);
  }
  async values(): Promise<any[]> {
    return Object.values(this.data);
  }
  async clear(): Promise<void> {
    this.data = {};
    if (isTauri) {
      const { deleteAppFile } = await import('./app-file-storage.js');
      await deleteAppFile(this.path);
    } else {
      await idbDeleteBlob(this.path);
    }
    this.emitChange();
  }
  async length(): Promise<number> {
    return Object.keys(this.data).length;
  }
  async save(): Promise<void> {
    this.persist();
  }
  async reload(): Promise<void> {
    await this.init();
  }
  private emitChange() {
    for (const cb of this.onChangeCbs) {
      cb(this.data);
    }
  }
  private emitKeyChange(key: string, value: any) {
    if (this.perKey.has(key)) {
      for (const cb of this.perKey.get(key)!) {
        cb(value);
      }
    }
  }
}

export const Store = LocalStorageStore;
