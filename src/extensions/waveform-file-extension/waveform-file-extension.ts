/**
 * Waveform File Extension
 * 
 * Provides functionality for loading, displaying, and managing waveform files.
 * Includes file displays, file manager, and signal trees.
 */

import { Extension, ExtensionContext } from "../types.js";
import { FileManager } from "./file-manager/file-manager.js";
import "./file-display/file-display.js";
import "./trees/files-tree.js";
import "./trees/selected-signals-tree.js";

/**
 * API provided by the waveform file extension
 */
export interface WaveformFileAPI {
    /**
     * Get the file manager instance
     */
    getFileManager(): FileManager | null;
}

export class WaveformFileExtension implements Extension {
    readonly metadata = {
        id: 'core/waveform-file',
        name: 'Waveform File Extension',
        description: 'Provides waveform file loading, display, and management',
    };

    private fileManager: FileManager | null = null;

    async activate(context: ExtensionContext): Promise<WaveformFileAPI> {
        // The file manager is created by app-main
        // This extension ensures the custom elements are registered
        
        return {
            getFileManager: () => this.fileManager,
        };
    }

    /**
     * Set the file manager instance (called by app-main after creating it)
     */
    setFileManager(fileManager: FileManager): void {
        this.fileManager = fileManager;
    }
}
