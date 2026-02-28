import { isTauri } from "../backend/index.js";

// Tauri fs imports are loaded dynamically so the module can be used in web builds
let tauriFs: typeof import("@tauri-apps/plugin-fs") | null = null;

async function ensureTauriFs() {
  if (!tauriFs) {
    // lazy-load to avoid bundling the entire API for web
    tauriFs = await import("@tauri-apps/plugin-fs");
  }
  return tauriFs;
}

// IndexedDB constants used when running in a browser
const DB_NAME = "swell-app-files";
const STORE_NAME = "files";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(key: string): Promise<string | null> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDb();
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () =>
        resolve(req.result == null ? null : (req.result as string));
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}

function idbPut(key: string, value: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDb();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}

function idbDelete(key: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDb();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}

export async function writeAppFile(
  path: string,
  contents: string,
): Promise<void> {
  if (isTauri) {
    const fs = await ensureTauriFs();
    await fs.writeTextFile(path, contents, {
      baseDir: fs.BaseDirectory.AppData,
    });
  } else {
    await idbPut(path, contents);
  }
}

export async function readAppFile(path: string): Promise<string | null> {
  if (isTauri) {
    const fs = await ensureTauriFs();
    try {
      return await fs.readTextFile(path, { baseDir: fs.BaseDirectory.AppData });
    } catch (e) {
      // missing file -> null
      return null;
    }
  } else {
    return await idbGet(path);
  }
}

export async function deleteAppFile(path: string): Promise<void> {
  if (isTauri) {
    const fs = await ensureTauriFs();
    try {
      await fs.remove(path, { baseDir: fs.BaseDirectory.AppData });
    } catch {
      // ignore
    }
  } else {
    await idbDelete(path);
  }
}

export async function appFileExists(path: string): Promise<boolean> {
  if (isTauri) {
    const fs = await ensureTauriFs();
    return await fs.exists(path, { baseDir: fs.BaseDirectory.AppData });
  } else {
    const val = await idbGet(path);
    return val !== null;
  }
}

// convenience JSON helpers
export async function writeAppJSON<T>(path: string, obj: T): Promise<void> {
  await writeAppFile(path, JSON.stringify(obj, null, 2));
}

export async function readAppJSON<T>(path: string): Promise<T | null> {
  const txt = await readAppFile(path);
  if (txt == null) return null;
  return JSON.parse(txt) as T;
}
