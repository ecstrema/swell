import { DockLayoutSchema, type DockLayoutData } from './dock-state-schema.js';
import { DockLayout } from './types.js';
// use the generic file storage abstraction so both web and native routes
// land in the same place and we can write into the app directory on Tauri.
import { writeAppJSON, readAppJSON, appFileExists } from '../../utils/app-file-storage.js';

const DEBOUNCE_DELAY_MS = 500;
// file we store the layout under (relative to the application directory)
const DOCK_STATE_FILE = 'dock-state.json';

/**
 * DockStatePersistence handles saving and loading dock layout state
 * with debounced saves and schema validation
 */
export class DockStatePersistence {
    private saveTimeout: number | null = null;

    /**
     * Save the dock layout state (debounced)
     * @param layout The dock layout to save
     */
    public saveState(layout: DockLayout): void {
        // Clear any existing timeout
        if (this.saveTimeout !== null) {
            clearTimeout(this.saveTimeout);
        }

        // Set a new timeout to save after debounce delay
        this.saveTimeout = window.setTimeout(() => {
            this.saveStateImmediate(layout);
            this.saveTimeout = null;
        }, DEBOUNCE_DELAY_MS);
    }

    /**
     * Save the dock layout state immediately (without debounce)
     * @param layout The dock layout to save
     */
    private async saveStateImmediate(layout: DockLayout): Promise<void> {
        try {
            // Add version to the layout before saving
            const stateToSave = {
                version: 0,
                root: layout.root
            };

            // Validate the layout with arktype schema
            const validation = DockLayoutSchema(stateToSave);

            if (validation instanceof Error) {
                console.error('Dock layout validation failed:', validation.message);
                return;
            }

            // Serialize to JSON
            const json = JSON.stringify(stateToSave, null, 2);

            // write through file wrapper (native writes filesystem, web uses IndexedDB)
            await writeAppJSON(DOCK_STATE_FILE, stateToSave);
            console.log('Dock state saved successfully');
        } catch (error) {
            console.error('Failed to save dock state:', error);
        }
    }

    /**
     * Load the dock layout state
     * @returns The loaded dock layout, or null if not found or invalid
     */
    public async loadState(): Promise<DockLayout | null> {
        try {
            let json: string | null = null;

            // Read using wrapper; returns null when the file/key does not exist
            const obj = await readAppJSON<any>(DOCK_STATE_FILE);
            if (obj) {
                json = JSON.stringify(obj);
            } else {
                console.log('No saved dock state found');
                return null;
            }

            if (!json) {
                console.log('No saved dock state found');
                return null;
            }

            // Parse JSON
            const parsed = JSON.parse(json);

            // Validate with arktype schema
            const validation = DockLayoutSchema(parsed);

            if (validation instanceof Error) {
                console.error('Dock layout validation failed during load:', validation.message);
                return null;
            }

            console.log('Dock state loaded successfully');
            // Return only the root, as DockLayout type expects just { root: DockNode }
            return { root: parsed.root } as DockLayout;
        } catch (error) {
            console.error('Failed to load dock state:', error);
            return null;
        }
    }

    /**
     * Clear any pending save operations
     */
    public cancelPendingSave(): void {
        if (this.saveTimeout !== null) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
    }
}

// Create a singleton instance
export const dockStatePersistence = new DockStatePersistence();
