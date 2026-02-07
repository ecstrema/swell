// This file unifies the interface between the web backend (Wasm/API) and the native Tauri backend.

// Import backend functions (assuming they are generated in a 'backend' module)
import initSync, * as wasm from "../backend/pkg"; // specific path may vary

// Import tauri functions (assuming standard invoke)
import { invoke } from "@tauri-apps/api/core";

// Detect if we are running in Tauri
const isTauri = !!window.__TAURI_INTERNALS__;

if (!isTauri) {
  // If not in Tauri, initialize the Wasm backend
  initSync();
}

export const greet = async (name) => {
  if (isTauri) {
    return await invoke("greet", { name });
  }
  return wasm.greet(name);
}
