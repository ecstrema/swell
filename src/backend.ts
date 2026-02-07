// This file unifies the interface between the web backend (Wasm/API) and the native Tauri backend.

// Import backend functions (assuming they are generated in a 'backend' module)
import initSync, * as wasm from "../backend/pkg/backend"; // specific path may vary

// Import tauri functions (assuming standard invoke)
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

// Detect if we are running in Tauri
// @ts-ignore
export const isTauri = !!window.__TAURI_INTERNALS__;

if (!isTauri) {
  // If not in Tauri, initialize the Wasm backend
  initSync();
}

export async function openFileDialog(): Promise<string | File | undefined | null> {
  if (isTauri) {
    try {
      return await open({
        multiple: false,
        directory: false,
      });
    } catch (e) {
      console.error("Failed to open file dialog:", e);
      return null;
    }
  } else {
    // For web, we can use a simple file input as a fallback
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.onchange = (event) => {
        resolve((event.target as HTMLInputElement).files?.[0])
      };
      input.click();
    });
  }
}

export async function addFile(file: string | File): Promise<string> {
  if (isTauri && typeof file === "string") {
    return await invoke("add_file_native", { path: file });
  }
  if (typeof file === "string") {
    throw new Error("Expected a File object for web context");
  }
  return wasm.add_file_wasm(file);
}
