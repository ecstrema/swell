import { addFile, openFileDialog, getHierarchy, getFiles, removeFile } from "../backend.js";
import { FileDisplay } from "./file-display.js";
import { HierarchyRoot } from "./files-tree.js";
import { updateDocumentTitle } from "../utils/title-utils.js";

/**
 * Manages file operations including loading, opening, closing files
 * and tracking the active file state.
 */
export class FileManager {
    private fileResources = new Map<string, { element: FileDisplay, hierarchy: HierarchyRoot | null }>();
    private activeFileId: string | null = null;

    /**
     * Get all currently loaded file IDs
     */
    getFileIds(): string[] {
        return Array.from(this.fileResources.keys());
    }

    /**
     * Get the active file ID
     */
    getActiveFileId(): string | null {
        return this.activeFileId;
    }

    /**
     * Set the active file ID
     */
    setActiveFileId(id: string | null) {
        this.activeFileId = id;
    }

    /**
     * Check if a file is loaded
     */
    hasFile(id: string): boolean {
        return this.fileResources.has(id);
    }

    /**
     * Get file resources for a specific file
     */
    getFileResources(id: string) {
        return this.fileResources.get(id);
    }

    /**
     * Get all file resources
     */
    getAllFileResources() {
        return this.fileResources;
    }

    /**
     * Open file dialog and add a file
     * @returns The file ID if successful, null otherwise
     */
    async handleFileOpen(): Promise<string | null> {
        try {
            const file = await openFileDialog();
            if (file) {
                const result = await addFile(file);
                return result;
            }
            return null;
        } catch (err) {
            console.error("Error loading file:", err);
            return null;
        }
    }

    /**
     * Refresh files from backend and update file resources
     * @param onFileAdded Callback when a new file is added
     * @param onFileRemoved Callback when a file is removed
     * @returns Object with fileIds and activeFileId
     */
    async refreshFiles(
        onFileAdded?: (id: string) => Promise<void>,
        onFileRemoved?: (id: string) => void
    ): Promise<{ fileIds: string[], activeFileId: string | null }> {
        try {
            const files = await getFiles();

            // Remove closed files
            for (const [id, value] of this.fileResources) {
                if (!files.includes(id)) {
                    if (onFileRemoved) {
                        onFileRemoved(id);
                    }
                    value.element.remove();
                    this.fileResources.delete(id);
                }
            }

            // Add new files
            for (const id of files) {
                if (!this.fileResources.has(id)) {
                    const fileDisplay = new FileDisplay();
                    fileDisplay.filename = id;

                    // Load hierarchy
                    let hierarchy = null;
                    try {
                        hierarchy = await getHierarchy(id);
                    } catch (e) {
                        console.error("Error loading hierarchy for", id, e);
                    }

                    this.fileResources.set(id, {
                        element: fileDisplay,
                        hierarchy: hierarchy
                    });

                    if (onFileAdded) {
                        await onFileAdded(id);
                    }
                }
            }

            // Handle active file state
            const fileIds = Array.from(this.fileResources.keys());

            if (this.activeFileId && !this.fileResources.has(this.activeFileId)) {
                this.activeFileId = null;
            }

            if (!this.activeFileId && fileIds.length > 0) {
                this.activeFileId = fileIds[fileIds.length - 1];
            }

            // Update document title
            if (this.activeFileId) {
                updateDocumentTitle(this.activeFileId);
            } else {
                updateDocumentTitle(null);
            }

            return { fileIds, activeFileId: this.activeFileId };
        } catch (e) {
            console.error("Error refreshing files:", e);
            return { fileIds: [], activeFileId: null };
        }
    }

    /**
     * Close a file
     */
    async closeFile(id: string): Promise<void> {
        try {
            await removeFile(id);
        } catch (e) {
            console.error(e);
        }
    }
}
