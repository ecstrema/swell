/**
 * Utility functions for managing the window/document title
 */

/**
 * Updates the document title based on the active file
 * @param fileId - The full file ID/path, or null for no active file
 */
export function updateDocumentTitle(fileId: string | null): void {
    if (!fileId) {
        document.title = 'Swell';
        return;
    }

    // Extract just the filename from the full path
    const filename = fileId.split(/[/\\]/).pop() || fileId;
    document.title = `${filename} - Swell`;
}
