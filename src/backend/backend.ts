// This file unifies the interface between the web backend (Wasm/API) and the native Tauri backend.

import init, * as wasm from "../../backend/pkg/backend";

import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { saveFileToSession, removeFileFromSession, getSessionFiles } from "../utils/file-session.js";

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
        filters: [{
          name: 'Waveform Files',
          extensions: ['vcd', 'fst', 'ghw']
        }]
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
      input.accept = ".vcd,.fst,.ghw";
      input.onchange = (event) => {
        resolve((event.target as HTMLInputElement).files?.[0])
      };
      input.click();
    });
  }
}

/**
 * Open a file dialog to select a .swellstate file
 */
export async function openStateFileDialog(): Promise<string | File | undefined | null> {
  if (isTauri) {
    try {
      return await open({
        multiple: false,
        directory: false,
        filters: [{
          name: 'Swell State Files',
          extensions: ['swellstate']
        }]
      });
    } catch (e) {
      console.error("Failed to open state file dialog:", e);
      return null;
    }
  } else {
    // For web, use file input
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".swellstate";
      input.onchange = (event) => {
        resolve((event.target as HTMLInputElement).files?.[0])
      };
      input.click();
    });
  }
}

/**
 * Open a save file dialog for saving a .swellstate file
 * @param defaultName - Optional default file name
 */
export async function saveStateFileDialog(defaultName?: string): Promise<string | null> {
  if (isTauri) {
    try {
      return await save({
        defaultPath: defaultName,
        filters: [{
          name: 'Swell State Files',
          extensions: ['swellstate']
        }]
      });
    } catch (e) {
      console.error("Failed to open save state file dialog:", e);
      return null;
    }
  } else {
    // For web, we'll use download functionality
    // Return a synthetic path to trigger the download
    return defaultName || 'state.swellstate';
  }
}

export const addFile = async (fileOrPath: string | File): Promise<string> => {
  if (isTauri) {
    return await invoke("add_file_command", { path: fileOrPath });
  }

  if (fileOrPath instanceof File) {
      const buffer = await fileOrPath.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const result = wasm.add_file_bytes(fileOrPath.name, bytes);
      
      // Save to IndexedDB for session persistence
      await saveFileToSession(fileOrPath.name, bytes);
      
      return result;
  }

  throw new Error("Expected File object in Web mode");
}

/**
 * Load an example file from the public/examples directory
 * @param filename - The name of the example file (e.g., "simple.vcd")
 * @returns The file ID
 */
export const loadExampleFile = async (filename: string): Promise<string> => {
  if (isTauri) {
    // In Tauri, load from the examples directory
    const examplesPath = `examples/${filename}`;
    return await invoke("add_file_command", { path: examplesPath });
  }

  // In web mode, fetch from public/examples
  // Use BASE_URL to support deployment with a base path (e.g., GitHub Pages)
  // Vite replaces import.meta.env.BASE_URL at build time:
  // - Default: "/" -> path becomes "/examples/simple.vcd"
  // - GitHub Pages: "/swell/" -> path becomes "/swell/examples/simple.vcd"
  const basePath = import.meta.env.BASE_URL || '/';
  const examplesPath = `${basePath}examples/${filename}`;
  const response = await fetch(examplesPath);
  if (!response.ok) {
    throw new Error(`Failed to load example file: ${filename}`);
  }
  
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const result = wasm.add_file_bytes(filename, bytes);
  
  // Save to IndexedDB for session persistence
  await saveFileToSession(filename, bytes);
  
  return result;
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
  
  const result = wasm.remove_file(path);
  
  // Remove from IndexedDB
  await removeFileFromSession(path);
  
  return result;
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

/**
 * Restore files from the previous session (web only)
 * This is automatically called on startup for Tauri, but needs to be manually called for web
 */
export const restoreSession = async (): Promise<void> => {
    if (isTauri) {
        // Tauri handles session restoration in Rust on startup
        return;
    }
    
    try {
        const sessionFiles = await getSessionFiles();
        console.log(`Restoring ${sessionFiles.length} files from session`);
        
        for (const file of sessionFiles) {
            try {
                // Note: We call wasm.add_file_bytes directly instead of addFile()
                // because the files are already persisted in IndexedDB. We don't want
                // to re-save them via saveFileToSession().
                await wasm.add_file_bytes(file.name, file.data);
            } catch (e) {
                console.error(`Failed to restore file ${file.name}:`, e);
            }
        }
    } catch (e) {
        console.error('Failed to restore session:', e);
    }
};

/**
 * Get files passed as command-line arguments (Tauri only)
 * Returns an empty array if not in Tauri or if no files were passed
 */
export const getStartupFiles = async (): Promise<string[]> => {
    if (!isTauri) {
        return [];
    }
    
    try {
        return await invoke("get_startup_files");
    } catch (e) {
        console.error('Failed to get startup files:', e);
        return [];
    }
};

/**
 * Write text content to a file
 * @param path - File path (Tauri) or filename (web)
 * @param content - Text content to write
 */
export const writeTextFile = async (path: string, content: string): Promise<void> => {
    if (isTauri) {
        try {
            await invoke("write_text_file", { path, content });
        } catch (e) {
            console.error(`Failed to write file ${path}:`, e);
            throw e;
        }
    } else {
        // For web, trigger a download
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = path;
        a.click();
        URL.revokeObjectURL(url);
    }
};

/**
 * Read text content from a file
 * @param fileOrPath - File object (web) or path string (Tauri)
 */
export const readTextFile = async (fileOrPath: string | File): Promise<string> => {
    if (isTauri) {
        if (typeof fileOrPath !== 'string') {
            throw new Error('Expected file path string in Tauri mode');
        }
        try {
            return await invoke("read_text_file", { path: fileOrPath });
        } catch (e) {
            console.error(`Failed to read file ${fileOrPath}:`, e);
            throw e;
        }
    } else {
        if (!(fileOrPath instanceof File)) {
            throw new Error('Expected File object in web mode');
        }
        return await fileOrPath.text();
    }
};
