// This file unifies the interface between the web backend (Wasm/API) and the native Tauri backend.

// Import backend functions (assuming they are generated in a 'backend' module)
import * as wasm from "../backend/pkg"; // specific path may vary

// Import tauri functions (assuming standard invoke)
import { invoke } from "@tauri-apps/api/core";

// Detect if we are running in Tauri
const isTauri = !!window.__TAURI_INTERNALS__;

/**
 * @param {string} tauriName
 * @template {(...args: any[]) => any} T
 * @param {T} wasmFunction
 * @return {(...args: Parameters<T>) => Promise<ReturnType<T>>}
 */
function makeUnifiedInterface(tauriName, wasmFunction) {
  /** @param {Parameters<T>} args */
  return async (...args) => {
    if (isTauri) {
      return await invoke(tauriName, { args });
    }
    return await wasmFunction(...args);
  };
}

export const load_file = makeUnifiedInterface("load_file", wasm.load_file_wasm);
export const list_files = makeUnifiedInterface("list_files", wasm.list_files);

// Add other unified functions here
