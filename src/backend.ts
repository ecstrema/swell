// This file unifies the interface between the web backend (Wasm/API) and the native Tauri backend.

import init, * as wasm from "../backend/pkg/backend";

import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

// Detect if we are running in Tauri
// @ts-ignore
export const isTauri = !!window.__TAURI_INTERNALS__;

if (!isTauri) {
  // If not in Tauri, initialize the Wasm backend
  await init();
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

export const addFile = async (fileOrPath: string | File): Promise<string> => {
  if (isTauri) {
    return await invoke("add_file_command", { path: fileOrPath });
  }

  if (fileOrPath instanceof File) {
      const buffer = await fileOrPath.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      return wasm.add_file_bytes(fileOrPath.name, bytes);
  }

  throw new Error("Expected File object in Web mode");
}

export const getFiles = async (): Promise<string[]> => {
  if (isTauri) {
    return await invoke("get_files");
  }
  return wasm.get_files();
}

export const removeFile = async (path: string) => {
  if (isTauri) {
    return await invoke("remove_file", { path });
  }
  return wasm.remove_file(path);
}


export interface HierarchyVar {
    name: string;
    ref: number;
}

export interface HierarchyScope {
    name: string;
    ref: number;
    vars: HierarchyVar[];
    scopes: HierarchyScope[];
}

export interface HierarchyRoot {
    name: string;
    ref: number;
    vars: HierarchyVar[];
    scopes: HierarchyScope[];
}

export interface SignalChange {
    time: number;
    value: string;
}

export const getHierarchy = async (filename: string): Promise<HierarchyRoot> => {
    if (isTauri) {
        return await invoke("get_hierarchy", { filename });
    }
    return wasm.get_hierarchy_wasm(filename);
};

export const getSignalChanges = async (filename: string, signalId: number, start: number, end: number): Promise<SignalChange[]> => {
    // Note: Rust u64 might come back as number or BigInt depending on bindings.
    // Usually standard JSON keeps it as number (potential precision loss).
    if (isTauri) {
        // Tauri invoke passes arguments as JSON.
        // Rust accepts `signal_id` snake_case by default for serde structs, but arguments to commands usage depends on Tauri.
        // Tauri 2.0 usually camelCase arguments in invoke map to snake_case in Rust function arguments.
        return await invoke("get_signal_changes", { filename, signalId, start, end });
    }
    // wasm-bindgen uses direct args
    // However, JS numbers for u64 might be risky. BigInt might be required.
    // Let's assume passed as number/BigInt works.
    return wasm.get_signal_changes_wasm(filename, signalId, BigInt(start), BigInt(end));
};
