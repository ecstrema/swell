// Simple persisted key/value store abstraction
// - Web: backed by localStorage (per-store JSON blob)
// - Native (Tauri): backed by plugin-store (LazyStore/Store) when available

import { UnlistenFn } from "@tauri-apps/api/event";
import { isTauri } from "../backend/index.js";
import { LazyStore } from "@tauri-apps/plugin-store";

// @ts-ignore
class LocalStorageStore implements LazyStore {

  private path: string;
  private data: Record<string, any> = {};
  private onChangeCbs = new Set<(all: Record<string, any>) => void>();
  private perKey = new Map<string, Set<(val: any) => void>>();

  constructor(filename: string) {
    this.path = filename;

    addEventListener("storage", (e) => {
      if (e.key === this.path) {
        this.init();
        this.emitChange();
      }
    });

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
      const raw = localStorage.getItem(this.path);
      if (raw) this.data = JSON.parse(raw);
      else this.data = {};
    } catch (e) {
      console.error("persisted-store: failed to read localStorage:", e);
      this.data = {};
    }
  }

  private persist() {
    try {
      localStorage.setItem(this.path, JSON.stringify(this.data));
    } catch (e) {
      console.error("persisted-store: failed to write localStorage:", e);
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
    localStorage.removeItem(this.path);
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

export const Store = isTauri ? LazyStore : LocalStorageStore;
