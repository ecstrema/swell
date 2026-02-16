import { Command } from "../shortcuts/types.js";
import { CommandRegistry } from "../shortcuts/command-registry.js";
import { ShortcutManager } from "../shortcuts/shortcut-manager.js";
import { css } from "../utils/css-utils.js";
import { scrollbarSheet } from "../styles/shared-sheets.js";
import commandPaletteCss from "./command-palette.css?inline";
import "./shortcut-display.js";
import { ShortcutDisplay } from "./shortcut-display.js";

/**
 * Command Palette - A searchable command launcher
 * Opens with Ctrl+K (Cmd+K on Mac) and provides fuzzy search over all registered commands
 */
export class CommandPalette extends HTMLElement {
    private commandRegistry: CommandRegistry;
    private shortcutManager: ShortcutManager | null;
    private isOpen: boolean = false;
    private searchInput: HTMLInputElement | null = null;
    private resultsContainer: HTMLDivElement | null = null;
    private selectedIndex: number = 0;
    private filteredCommands: Command[] = [];

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
    }

    open() {
        this.isOpen = true;
        this.classList.add('open');
        this.selectedIndex = 0;

        // Reset and focus
        if (this.searchInput) {
            this.searchInput.value = '';
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
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    private handleSearch() {
        const query = this.searchInput?.value.toLowerCase() || '';
        const allCommands = this.commandRegistry.getAll();

        if (query === '') {
            this.filteredCommands = allCommands;
        } else {
            this.filteredCommands = allCommands.filter(cmd => {
                const labelMatch = cmd.label.toLowerCase().includes(query);
                const idMatch = cmd.id.toLowerCase().includes(query);
                return labelMatch || idMatch;
            });
        }

        this.selectedIndex = 0;
        this.render();
    }

    private handleKeyDown(e: KeyboardEvent) {
        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                this.close();
                break;

            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(
                    this.selectedIndex + 1,
                    this.filteredCommands.length - 1
                );
                this.render();
                break;

            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
                this.render();
                break;

            case 'Enter':
                e.preventDefault();
                this.executeSelected();
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
            if (index === this.selectedIndex) {
                item.classList.add('selected');
            }

            const label = document.createElement('div');
            label.className = 'label';
            label.textContent = command.label;

            item.appendChild(label);

            // Add shortcut if available
            if (this.shortcutManager) {
                const shortcuts = this.shortcutManager.getShortcutsForCommand(command.id);
                if (shortcuts.length > 0) {
                    const shortcutDisplay = document.createElement('app-shortcut-display') as ShortcutDisplay;
                    shortcutDisplay.setAttribute('shortcut', ShortcutManager.formatShortcut(shortcuts[0]));
                    item.appendChild(shortcutDisplay);
                }
            }

            // Click handler
            item.addEventListener('click', () => {
                this.selectedIndex = index;
                this.executeSelected();
            });

            // Mouse over handler
            item.addEventListener('mouseenter', () => {
                this.selectedIndex = index;
                this.render();
            });

            this.resultsContainer!.appendChild(item);
        });

        // Scroll selected item into view
        // Note: Check for scrollIntoView is needed for jsdom compatibility in tests
        const selectedElement = this.resultsContainer.querySelector('.result-item.selected');
        if (selectedElement && typeof selectedElement.scrollIntoView === 'function') {
            selectedElement.scrollIntoView({ block: 'nearest' });
        }
    }
}

if (!customElements.get('command-palette')) {
    customElements.define('command-palette', CommandPalette);
}
