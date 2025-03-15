// Bridge between the Tauri API and the wasm-bindgen generated Rust API.

import { invoke } from '@tauri-apps/api/core';
import * as wasm from 'wasm';

// TODO: check if this properly tree shakes so that only the wasm functions are used in web, and only the tauri functions are used in tauri.
const tauri = process.env.TAURI_ENV_DEBUG !== undefined;

console.log('tauri', tauri, process.env.TAURI_ENV_DEBUG);

export const getChanges = tauri
  ? async (signalId: string, start: number, end: number) => invoke('get_changes', { signalId, start, end })
  : async (signalId: string, start: number, end: number) => wasm.get_changes(signalId, start, end);

export const getSignals = tauri
  ? async (file: string) => invoke('get_signals', { file })
  : async (file: string) => wasm.get_signals(file);

export const openFile = tauri
  ? async (path: string) => invoke('open_file', { path })
  : async (path: string) => wasm.open_file(path);;
