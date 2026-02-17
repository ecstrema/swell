import { Command, SelectOption } from "../../shortcuts/types.js";
import { CommandRegistry } from "../../shortcuts/command-registry.js";
import { ShortcutManager } from "../../shortcuts/shortcut-manager.js";
import { css } from "../../utils/css-utils.js";
import { scrollbarSheet } from "../../styles/shared-sheets.js";
import commandPaletteCss from "./command-palette.css?inline";
import "../shortcut-display/shortcut-display.js";
import { ShortcutDisplay } from "../shortcut-display/shortcut-display.js";

/**
 * Command Palette - A searchable command launcher and option selector
 * Opens with Ctrl+K (Cmd+K on Mac) and provides fuzzy search over all registered commands
 * Can also be used as a modal selector with showSelection()
 */
export class CommandPalette extends HTMLElement {
    private commandRegistry: CommandRegistry;
    private shortcutManager: ShortcutManager | null;
    private isOpen: boolean = false;
    private searchInput: HTMLInputElement | null = null;
    private resultsContainer: HTMLDivElement | null = null;
    private selectedIndex: number = 0;
    private filteredCommands: Command[] = [];
    
    // Selection mode state
    private isSelectionMode: boolean = false;
    private selectionOptions: SelectOption[] = [];
    private filteredOptions: SelectOption[] = [];
    private selectionResolve: ((value: any) => void) | null = null;
    private selectionReject: ((reason?: any) => void) | null = null;

    constructor(commandRegistry: CommandRegistry, shortcutManager?: ShortcutManager) {
        super();
        this.commandRegistry = commandRegistry;
        this.shortcutManager = shortcutManager || null;

        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.adoptedStyleSheets = [scrollbarSheet, css(commandPaletteCss)];

        this.shadowRoot!.innerHTML = `
            <div class="overlay"></div>
            <div class="palette">
                <div class="search-container">
                    <input
                        type="text"
                        class="search-input"
                        placeholder="Type a command..."
                        autocomplete="off"
                        spellcheck="false"
                    />
                </div>
                <div class="results"></div>
            </div>
        `;

        this.searchInput = this.shadowRoot!.querySelector('.search-input');
        this.resultsContainer = this.shadowRoot!.querySelector('.results');

        this.setupEventListeners();
    }

    private setupEventListeners() {
        // Search input
        this.searchInput?.addEventListener('input', () => {
            this.handleSearch();
        });

        // Keyboard navigation
        this.searchInput?.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });

        // Close on overlay click
        const overlay = this.shadowRoot!.querySelector('.overlay');
        overlay?.addEventListener('click', () => {
            this.close();
        });

        // Prevent palette clicks from closing
        const palette = this.shadowRoot!.querySelector('.palette');
        palette?.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Delegated click handler for result items
        this.resultsContainer?.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const resultItem = target.closest('.result-item') as HTMLElement;
            
            if (resultItem && resultItem.hasAttribute('data-index')) {
                const index = parseInt(resultItem.getAttribute('data-index')!, 10);
                this.selectedIndex = index;
                
                if (this.isSelectionMode) {
                    this.selectOption();
                } else {
                    this.executeSelected();
                }
            }
        });

        // Delegated mouseover handler for result items
        this.resultsContainer?.addEventListener('mouseover', (e) => {
            const target = e.target as HTMLElement;
            const resultItem = target.closest('.result-item') as HTMLElement;
            
            if (resultItem && resultItem.hasAttribute('data-index')) {
                const index = parseInt(resultItem.getAttribute('data-index')!, 10);
                
                // Only update if the index has changed to avoid unnecessary re-renders
                if (this.selectedIndex !== index) {
                    this.selectedIndex = index;
                    
                    if (this.isSelectionMode) {
                        this.renderSelection();
                    } else {
                        this.render();
                    }
                }
            }
        });
    }

    open() {
        this.isOpen = true;
        this.classList.add('open');
        this.selectedIndex = 0;

        // Reset and focus
        if (this.searchInput) {
            this.searchInput.value = '';
            this.searchInput.placeholder = 'Type a command...';
            this.searchInput.focus();
        }

        // Show all commands initially
        this.handleSearch();
    }

    close() {
        this.isOpen = false;
        this.classList.remove('open');
        this.filteredCommands = [];
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        
        // Clean up selection mode
        if (this.isSelectionMode) {
            this.isSelectionMode = false;
            this.selectionOptions = [];
            this.filteredOptions = [];
            if (this.selectionReject) {
                this.selectionReject(new Error('Selection cancelled'));
                this.selectionResolve = null;
                this.selectionReject = null;
            }
        }
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Show a list of options for the user to select from
     * Returns a promise that resolves with the selected option's value
     */
    showSelection<T = any>(options: SelectOption<T>[], placeholder?: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.isSelectionMode = true;
            this.selectionOptions = options;
            this.filteredOptions = options;
            this.selectionResolve = resolve;
            this.selectionReject = reject;
            this.selectedIndex = 0;
            
            this.isOpen = true;
            this.classList.add('open');
            
            if (this.searchInput) {
                this.searchInput.value = '';
                this.searchInput.placeholder = placeholder || 'Type to filter...';
                this.searchInput.focus();
            }
            
            this.renderSelection();
        });
    }

    private handleSearch() {
        const query = this.searchInput?.value.toLowerCase() || '';
        
        if (this.isSelectionMode) {
            // Filter selection options
            if (query === '') {
                this.filteredOptions = this.selectionOptions;
            } else {
                this.filteredOptions = this.selectionOptions.filter(opt => {
                    const labelMatch = opt.label.toLowerCase().includes(query);
                    const idMatch = opt.id.toLowerCase().includes(query);
                    const descriptionMatch = opt.description?.toLowerCase().includes(query) || false;
                    return labelMatch || idMatch || descriptionMatch;
                });
            }
            this.selectedIndex = 0;
            this.renderSelection();
        } else {
            // Filter commands
            const allCommands = this.commandRegistry.getAll();
            if (query === '') {
                this.filteredCommands = allCommands;
            } else {
                this.filteredCommands = allCommands.filter(cmd => {
                    const labelMatch = cmd.label.toLowerCase().includes(query);
                    const idMatch = cmd.id.toLowerCase().includes(query);
                    const descriptionMatch = cmd.description?.toLowerCase().includes(query) || false;
                    return labelMatch || idMatch || descriptionMatch;
                });
            }
            this.selectedIndex = 0;
            this.render();
        }
    }

    private handleKeyDown(e: KeyboardEvent) {
        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                this.close();
                break;

            case 'ArrowDown':
                e.preventDefault();
                const maxIndex = this.isSelectionMode 
                    ? this.filteredOptions.length - 1 
                    : this.filteredCommands.length - 1;
                this.selectedIndex = Math.min(this.selectedIndex + 1, maxIndex);
                this.isSelectionMode ? this.renderSelection() : this.render();
                break;

            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
                this.isSelectionMode ? this.renderSelection() : this.render();
                break;

            case 'Enter':
                e.preventDefault();
                this.isSelectionMode ? this.selectOption() : this.executeSelected();
                break;
        }
    }

    private executeSelected() {
        const selectedCommand = this.filteredCommands[this.selectedIndex];
        if (selectedCommand) {
            this.commandRegistry.execute(selectedCommand.id);
            this.close();
        }
    }

    private selectOption() {
        const selectedOption = this.filteredOptions[this.selectedIndex];
        if (selectedOption && this.selectionResolve) {
            const value = selectedOption.value;
            const resolve = this.selectionResolve;
            
            // Reset state before resolving
            this.isSelectionMode = false;
            this.selectionOptions = [];
            this.filteredOptions = [];
            this.selectionResolve = null;
            this.selectionReject = null;
            
            // Close and resolve
            this.isOpen = false;
            this.classList.remove('open');
            resolve(value);
        }
    }

    private render() {
        if (!this.resultsContainer) return;

        if (this.filteredCommands.length === 0) {
            this.resultsContainer.innerHTML = `
                <div class="empty-state">No commands found</div>
            `;
            return;
        }

        this.resultsContainer.innerHTML = '';

        this.filteredCommands.forEach((command, index) => {
            const item = document.createElement('div');
            item.className = 'result-item';
            item.setAttribute('data-index', index.toString());
            if (index === this.selectedIndex) {
                item.classList.add('selected');
            }

            // If command has a description, use a container
            if (command.description) {
                const labelContainer = document.createElement('div');
                labelContainer.className = 'label-container';

                const label = document.createElement('div');
                label.className = 'label';
                label.textContent = command.label;

                const description = document.createElement('div');
                description.className = 'description';
                description.textContent = command.description;

                labelContainer.appendChild(label);
                labelContainer.appendChild(description);
                item.appendChild(labelContainer);
            } else {
                const label = document.createElement('div');
                label.className = 'label';
                label.textContent = command.label;
                item.appendChild(label);
            }

            // Add shortcut if available
            if (this.shortcutManager) {
                const shortcuts = this.shortcutManager.getShortcutsForCommand(command.id);
                if (shortcuts.length > 0) {
                    const shortcutDisplay = document.createElement('app-shortcut-display') as ShortcutDisplay;
                    shortcutDisplay.setAttribute('shortcut', ShortcutManager.formatShortcut(shortcuts[0]));
                    item.appendChild(shortcutDisplay);
                }
            }

            this.resultsContainer!.appendChild(item);
        });

        // Scroll selected item into view
        // Note: Check for scrollIntoView is needed for jsdom compatibility in tests
        const selectedElement = this.resultsContainer.querySelector('.result-item.selected');
        if (selectedElement && typeof selectedElement.scrollIntoView === 'function') {
            selectedElement.scrollIntoView({ block: 'nearest' });
        }
    }

    private renderSelection() {
        if (!this.resultsContainer) return;

        if (this.filteredOptions.length === 0) {
            this.resultsContainer.innerHTML = `
                <div class="empty-state">No options found</div>
            `;
            return;
        }

        this.resultsContainer.innerHTML = '';

        this.filteredOptions.forEach((option, index) => {
            const item = document.createElement('div');
            item.className = 'result-item';
            item.setAttribute('data-index', index.toString());
            if (index === this.selectedIndex) {
                item.classList.add('selected');
            }

            // If option has a description, use a container
            if (option.description) {
                const labelContainer = document.createElement('div');
                labelContainer.className = 'label-container';

                const label = document.createElement('div');
                label.className = 'label';
                label.textContent = option.label;

                const description = document.createElement('div');
                description.className = 'description';
                description.textContent = option.description;

                labelContainer.appendChild(label);
                labelContainer.appendChild(description);
                item.appendChild(labelContainer);
            } else {
                const label = document.createElement('div');
                label.className = 'label';
                label.textContent = option.label;
                item.appendChild(label);
            }

            this.resultsContainer!.appendChild(item);
        });

        // Scroll selected item into view
        const selectedElement = this.resultsContainer.querySelector('.result-item.selected');
        if (selectedElement && typeof selectedElement.scrollIntoView === 'function') {
            selectedElement.scrollIntoView({ block: 'nearest' });
        }
    }
}

if (!customElements.get('command-palette')) {
    customElements.define('command-palette', CommandPalette);
}
