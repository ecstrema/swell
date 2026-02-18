/**
 * Commands View Component (Shortcut Editor)
 *
 * Displays all registered commands with their descriptions and shortcuts in a table format.
 * Allows users to edit shortcuts by clicking on them, similar to VSCode's shortcut editor.
 * Includes a search bar to filter commands.
 */

import { Command, KeyboardShortcut } from "../shortcut-extension/types.js";
import { CommandExtension } from "../command-extension/command-extension.js";
import { ShortcutExtension } from "../shortcut-extension/shortcut-extension.js";
import { css } from "../../utils/css-utils.js";
import commandsViewCss from "./commands-view.css?inline";
import "../../components/shortcut-display/shortcut-display.js";
import { ShortcutDisplay } from "../../components/shortcut-display/shortcut-display.js";
import ShoSho from 'shosho';

export class CommandsView extends HTMLElement {
    private commandRegistry: CommandExtension | null = null;
    private shortcutManager: ShortcutExtension | null = null;
    private searchInput: HTMLInputElement | null = null;
    private tableBody: HTMLTableSectionElement | null = null;
    private allCommands: Command[] = [];
    private filteredCommands: Command[] = [];
    private editingCell: HTMLTableCellElement | null = null;
    private recordingDispose: (() => void) | null = null;
    private cellData = new WeakMap<HTMLTableCellElement, { currentShortcut: KeyboardShortcut | null, commandId: string }>();

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.adoptedStyleSheets = [css(commandsViewCss)];
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    disconnectedCallback() {
        // Clean up any active recording
        if (this.recordingDispose) {
            this.recordingDispose();
            this.recordingDispose = null;
        }
    }

    /**
     * Set the command registry
     */
    setCommandRegistry(registry: CommandExtension): void {
        this.commandRegistry = registry;
        this.loadCommands();
    }

    /**
     * Set the shortcut manager
     */
    setShortcutManager(manager: ShortcutExtension): void {
        this.shortcutManager = manager;
        this.renderCommands();
    }

    private render(): void {
        this.shadowRoot!.innerHTML = `
            <div class="commands-view">
                <div class="commands-view__header">
                    <h1 class="commands-view__title">Keyboard Shortcuts</h1>
                    <p class="commands-view__description">
                        View and customize keyboard shortcuts for all available commands.
                        Click on a shortcut to edit it.
                    </p>
                </div>

                <div class="commands-view__search">
                    <input
                        type="text"
                        class="commands-view__search-input"
                        placeholder="Search commands..."
                        autocomplete="off"
                        spellcheck="false"
                    />
                </div>

                <div class="commands-view__table-container">
                    <table class="commands-view__table">
                        <thead>
                            <tr>
                                <th class="commands-view__th commands-view__th--command">Command</th>
                                <th class="commands-view__th commands-view__th--description">Description</th>
                                <th class="commands-view__th commands-view__th--shortcut">Keyboard Shortcut</th>
                            </tr>
                        </thead>
                        <tbody class="commands-view__tbody"></tbody>
                    </table>
                </div>
            </div>
        `;

        this.searchInput = this.shadowRoot!.querySelector('.commands-view__search-input');
        this.tableBody = this.shadowRoot!.querySelector('.commands-view__tbody');
    }

    private setupEventListeners(): void {
        this.searchInput?.addEventListener('input', () => {
            this.handleSearch();
        });
    }

    private loadCommands(): void {
        if (!this.commandRegistry) {
            return;
        }

        this.allCommands = this.commandRegistry.getAll();
        this.filteredCommands = [...this.allCommands];
        this.renderCommands();
    }

    private handleSearch(): void {
        const query = this.searchInput?.value.toLowerCase() || '';

        if (!query) {
            this.filteredCommands = [...this.allCommands];
        } else {
            this.filteredCommands = this.allCommands.filter(cmd => {
                return (
                    cmd.id.toLowerCase().includes(query) ||
                    cmd.label.toLowerCase().includes(query) ||
                    (cmd.description && cmd.description.toLowerCase().includes(query))
                );
            });
        }

        this.renderCommands();
    }

    private renderCommands(): void {
        if (!this.tableBody) {
            return;
        }

        // Clear the table
        this.tableBody.innerHTML = '';

        if (this.filteredCommands.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 3;
            cell.className = 'commands-view__empty';
            cell.textContent = 'No commands found matching your search.';
            row.appendChild(cell);
            this.tableBody.appendChild(row);
            return;
        }

        // Render each command as a table row
        for (const command of this.filteredCommands) {
            const row = this.createCommandRow(command);
            this.tableBody.appendChild(row);
        }
    }

    private createCommandRow(command: Command): HTMLTableRowElement {
        const row = document.createElement('tr');
        row.className = 'commands-view__tr';

        // Command column
        const commandCell = document.createElement('td');
        commandCell.className = 'commands-view__td commands-view__td--command';
        const commandLabel = document.createElement('div');
        commandLabel.className = 'commands-view__command-label';
        commandLabel.textContent = command.label;
        const commandId = document.createElement('div');
        commandId.className = 'commands-view__command-id';
        commandId.textContent = command.id;
        commandCell.appendChild(commandLabel);
        commandCell.appendChild(commandId);
        row.appendChild(commandCell);

        // Description column
        const descriptionCell = document.createElement('td');
        descriptionCell.className = 'commands-view__td commands-view__td--description';
        descriptionCell.textContent = command.description || '';
        row.appendChild(descriptionCell);

        // Shortcut column
        const shortcutCell = document.createElement('td');
        shortcutCell.className = 'commands-view__td commands-view__td--shortcut';

        if (this.shortcutManager) {
            const shortcuts = this.shortcutManager.getShortcutsForCommand(command.id);
            if (shortcuts.length > 0) {
                const shortcutDisplay = new ShortcutDisplay();
                shortcutDisplay.setShortcut(shortcuts[0]);
                shortcutCell.appendChild(shortcutDisplay);

                // Store the current shortcut for editing using WeakMap
                this.cellData.set(shortcutCell, { currentShortcut: shortcuts[0], commandId: command.id });
            } else {
                const emptyShortcut = document.createElement('span');
                emptyShortcut.className = 'commands-view__empty-shortcut';
                emptyShortcut.textContent = 'No shortcut';
                shortcutCell.appendChild(emptyShortcut);

                this.cellData.set(shortcutCell, { currentShortcut: null, commandId: command.id });
            }

            // Make the shortcut cell clickable to edit
            shortcutCell.classList.add('commands-view__td--editable');
            shortcutCell.addEventListener('click', () => this.startEditingShortcut(shortcutCell, command.id));
        }

        row.appendChild(shortcutCell);

        return row;
    }

    private startEditingShortcut(cell: HTMLTableCellElement, commandId: string): void {
        // If already editing, cancel the previous edit
        if (this.editingCell) {
            this.cancelEdit();
        }

        this.editingCell = cell;
        const cellInfo = this.cellData.get(cell);
        const currentShortcut = cellInfo?.currentShortcut ?? null;

        // Clear the cell and show recording UI
        cell.innerHTML = '';
        cell.classList.add('commands-view__td--recording');

        const recordingMessage = document.createElement('div');
        recordingMessage.className = 'commands-view__recording-message';
        recordingMessage.textContent = 'Press keys for new shortcut...';
        cell.appendChild(recordingMessage);

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'commands-view__button-container';

        const cancelButton = document.createElement('button');
        cancelButton.className = 'commands-view__button commands-view__button--cancel';
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.cancelEdit();
        });

        const clearButton = document.createElement('button');
        clearButton.className = 'commands-view__button commands-view__button--clear';
        clearButton.textContent = 'Clear';
        clearButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.clearShortcut(commandId, currentShortcut);
        });

        buttonContainer.appendChild(clearButton);
        buttonContainer.appendChild(cancelButton);
        cell.appendChild(buttonContainer);

        // Start recording the shortcut
        let saveButton: HTMLButtonElement | null = null;
        this.recordingDispose = ShoSho.record((shortcut: KeyboardShortcut) => {
            // Trim the shortcut to get a clean value
            const trimmed = shortcut.trim();

            if (trimmed) {
                recordingMessage.textContent = `Recorded: ${ShoSho.format(trimmed)}`;

                // Add or update the save button after recording
                if (!saveButton) {
                    saveButton = document.createElement('button');
                    saveButton.className = 'commands-view__button commands-view__button--save';
                    saveButton.textContent = 'Save';
                    saveButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.saveShortcut(commandId, currentShortcut, trimmed);
                    });
                    buttonContainer.insertBefore(saveButton, cancelButton);
                } else {
                    // Update the existing save button to use the new shortcut
                    // Remove all existing listeners by cloning the button
                    const newSaveButton = saveButton.cloneNode(true) as HTMLButtonElement;
                    newSaveButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.saveShortcut(commandId, currentShortcut, trimmed);
                    });
                    saveButton.replaceWith(newSaveButton);
                    saveButton = newSaveButton;
                }
            }
        });
    }

    private cancelEdit(): void {
        if (!this.editingCell) {
            return;
        }

        // Stop recording
        if (this.recordingDispose) {
            this.recordingDispose();
            this.recordingDispose = null;
        }

        // Restore the original shortcut display
        const cellInfo = this.cellData.get(this.editingCell);
        const commandId = cellInfo?.commandId;

        if (commandId) {
            const command = this.allCommands.find(c => c.id === commandId);
            if (command) {
                const row = this.editingCell.parentElement as HTMLTableRowElement;
                const newRow = this.createCommandRow(command);
                row.replaceWith(newRow);
            }
        }

        this.editingCell = null;
    }

    private clearShortcut(commandId: string, currentShortcut: KeyboardShortcut | null): void {
        if (!this.shortcutManager || !currentShortcut) {
            return;
        }

        // Remove the shortcut
        this.shortcutManager.removeShortcut(commandId, currentShortcut);

        // Stop recording
        if (this.recordingDispose) {
            this.recordingDispose();
            this.recordingDispose = null;
        }

        // Re-render the row
        const command = this.allCommands.find(c => c.id === commandId);
        if (command && this.editingCell) {
            const row = this.editingCell.parentElement as HTMLTableRowElement;
            const newRow = this.createCommandRow(command);
            row.replaceWith(newRow);
        }

        this.editingCell = null;
    }

    private saveShortcut(commandId: string, oldShortcut: KeyboardShortcut | null, newShortcut: KeyboardShortcut): void {
        if (!this.shortcutManager) {
            return;
        }

        // Check for conflicts
        const conflictCommandId = this.shortcutManager.getCommandForShortcut(newShortcut);
        if (conflictCommandId && conflictCommandId !== commandId) {
            const conflictCommand = this.commandRegistry?.get(conflictCommandId);
            const conflictLabel = conflictCommand?.label || conflictCommandId;

            // Show conflict warning
            if (this.editingCell) {
                const recordingMessage = this.editingCell.querySelector('.commands-view__recording-message');
                if (recordingMessage) {
                    recordingMessage.textContent = `⚠️ Already assigned to "${conflictLabel}"`;
                    recordingMessage.classList.add('commands-view__recording-message--error');
                }
            }
            return;
        }

        // Update or add the shortcut
        if (oldShortcut) {
            this.shortcutManager.updateShortcut(commandId, oldShortcut, newShortcut);
        } else {
            this.shortcutManager.register({ shortcut: newShortcut, commandId });
        }

        // Stop recording
        if (this.recordingDispose) {
            this.recordingDispose();
            this.recordingDispose = null;
        }

        // Re-render the row
        const command = this.allCommands.find(c => c.id === commandId);
        if (command && this.editingCell) {
            const row = this.editingCell.parentElement as HTMLTableRowElement;
            const newRow = this.createCommandRow(command);
            row.replaceWith(newRow);
        }

        this.editingCell = null;
    }
}

// Note: Custom element registration is handled by the extension, not here
