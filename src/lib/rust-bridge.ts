// Bridge between the Tauri API and the wasm-bindgen generated Rust API.

import { invoke } from '@tauri-apps/api/core';
import * as wasm from 'wasm';

// TODO: check if this properly tree shakes so that only the wasm functions are used in web, and only the tauri functions are used in tauri.
const tauri = process.env.TAURI_ENV_DEBUG !== undefined;

console.log('tauri', tauri, process.env.TAURI_ENV_DEBUG);

export const getChanges = tauri
  ? async (filename: string, signalRef: number, start: number, end: number) => 
      invoke('get_changes', { filename, signalRef, start, end })
  : async (filename: string, signalRef: number, start: number, end: number) => 
      wasm.get_changes(filename, signalRef, start, end);

export const getHierarchy = tauri
  ? async (filename: string) => invoke('get_hierarchy', { filename })
  : async (filename: string) => wasm.get_hierarchy(filename);

export const openFile = tauri
  ? async (filename: string) => invoke('open_wave_file_native', { filename })
  : async (file: File) => wasm.open_wave_file_wasm(file);
