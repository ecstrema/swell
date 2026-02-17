/**
 * Commands View Component
 * 
 * Displays all registered commands with their descriptions and shortcuts.
 * Includes a search bar to filter commands.
 */

import { Command } from "../../shortcuts/types.js";
import { CommandRegistry } from "../../shortcuts/command-registry.js";
import { ShortcutManager } from "../../shortcuts/shortcut-manager.js";
import { css } from "../../utils/css-utils.js";
import commandsViewCss from "./commands-view.css?inline";
import "../../components/shortcut-display/shortcut-display.js";
import { ShortcutDisplay } from "../../components/shortcut-display/shortcut-display.js";

export class CommandsView extends HTMLElement {
    private commandRegistry: CommandRegistry | null = null;
    private shortcutManager: ShortcutManager | null = null;
    private searchInput: HTMLInputElement | null = null;
    private listContainer: HTMLDivElement | null = null;
    private allCommands: Command[] = [];
    private filteredCommands: Command[] = [];

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.adoptedStyleSheets = [css(commandsViewCss)];
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    /**
     * Set the command registry
     */
    setCommandRegistry(registry: CommandRegistry): void {
        this.commandRegistry = registry;
        this.loadCommands();
    }

    /**
     * Set the shortcut manager
     */
    setShortcutManager(manager: ShortcutManager): void {
        this.shortcutManager = manager;
        this.renderCommands();
    }

    private render(): void {
        this.shadowRoot!.innerHTML = `
            <div class="commands-view">
                <div class="commands-view__header">
                    <h1 class="commands-view__title">All Commands</h1>
                    <p class="commands-view__description">
                        Browse and search all available commands in the application.
                        Click on a command to execute it.
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

                <div class="commands-view__list"></div>
            </div>
        `;

        this.searchInput = this.shadowRoot!.querySelector('.commands-view__search-input');
        this.listContainer = this.shadowRoot!.querySelector('.commands-view__list');
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
        if (!this.listContainer) {
            return;
        }

        // Clear the list
        this.listContainer.innerHTML = '';

        if (this.filteredCommands.length === 0) {
            this.listContainer.innerHTML = `
                <div class="commands-view__empty">
                    No commands found matching your search.
                </div>
            `;
            return;
        }

        // Render each command
        for (const command of this.filteredCommands) {
            const item = this.createCommandItem(command);
            this.listContainer.appendChild(item);
        }
    }

    private createCommandItem(command: Command): HTMLElement {
        const item = document.createElement('div');
        item.className = 'command-item';

        const content = document.createElement('div');
        content.className = 'command-item__content';

        const header = document.createElement('div');
        header.className = 'command-item__header';

        const label = document.createElement('span');
        label.className = 'command-item__label';
        label.textContent = command.label;

        const id = document.createElement('span');
        id.className = 'command-item__id';
        id.textContent = command.id;

        header.appendChild(label);
        header.appendChild(id);
        content.appendChild(header);

        if (command.description) {
            const description = document.createElement('p');
            description.className = 'command-item__description';
            description.textContent = command.description;
            content.appendChild(description);
        }

        item.appendChild(content);

        // Add shortcuts if available
        if (this.shortcutManager) {
            const shortcuts = this.shortcutManager.getShortcutsForCommand(command.id);
            if (shortcuts.length > 0) {
                const shortcutContainer = document.createElement('div');
                shortcutContainer.className = 'command-item__shortcut';

                const shortcutDisplay = new ShortcutDisplay();
                shortcutDisplay.setShortcut(shortcuts[0]);
                shortcutContainer.appendChild(shortcutDisplay);

                item.appendChild(shortcutContainer);
            }
        }

        // Make the item clickable to execute the command
        item.addEventListener('click', () => {
            this.commandRegistry?.execute(command.id);
        });

        return item;
    }
}

customElements.define('commands-view', CommandsView);
