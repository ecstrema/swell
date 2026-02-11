import { Command } from "../shortcuts/types.js";
import { CommandRegistry } from "../shortcuts/command-registry.js";

/**
 * Command Palette - A searchable command launcher
 * Opens with Ctrl+K (Cmd+K on Mac) and provides fuzzy search over all registered commands
 */
export class CommandPalette extends HTMLElement {
    private commandRegistry: CommandRegistry;
    private isOpen: boolean = false;
    private searchInput: HTMLInputElement | null = null;
    private resultsContainer: HTMLDivElement | null = null;
    private selectedIndex: number = 0;
    private filteredCommands: Command[] = [];

    constructor(commandRegistry: CommandRegistry) {
        super();
        this.commandRegistry = commandRegistry;
        
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.innerHTML = `
            <style>
                :host {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 10000;
                    pointer-events: none;
                }
                
                :host(.open) {
                    display: block;
                    pointer-events: auto;
                }
                
                .overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.5);
                    animation: fadeIn 0.15s ease-out;
                }
                
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }
                
                .palette {
                    position: absolute;
                    top: 20%;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 90%;
                    max-width: 600px;
                    background-color: var(--color-bg-surface, #ffffff);
                    border: 1px solid var(--color-border, #cccccc);
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    overflow: hidden;
                    animation: slideDown 0.15s ease-out;
                }
                
                @keyframes slideDown {
                    from {
                        transform: translateX(-50%) translateY(-10px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(-50%) translateY(0);
                        opacity: 1;
                    }
                }
                
                .search-container {
                    padding: 16px;
                    border-bottom: 1px solid var(--color-border, #cccccc);
                }
                
                .search-input {
                    width: 100%;
                    padding: 12px;
                    font-size: 16px;
                    border: none;
                    outline: none;
                    background-color: transparent;
                    color: var(--color-text, #0f0f0f);
                    font-family: inherit;
                }
                
                .search-input::placeholder {
                    color: var(--color-text-muted, #666666);
                }
                
                .results {
                    max-height: 400px;
                    overflow-y: auto;
                }
                
                .result-item {
                    padding: 12px 16px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 1px solid var(--color-border, #eeeeee);
                    color: var(--color-text, #0f0f0f);
                    background-color: var(--color-bg-surface, #ffffff);
                }
                
                .result-item:last-child {
                    border-bottom: none;
                }
                
                .result-item:hover,
                .result-item.selected {
                    background-color: var(--color-bg-hover, #e0e0e0);
                }
                
                .result-item .label {
                    flex: 1;
                    font-size: 14px;
                }
                
                .result-item .id {
                    font-size: 12px;
                    color: var(--color-text-muted, #666666);
                    font-family: monospace;
                }
                
                .empty-state {
                    padding: 40px 16px;
                    text-align: center;
                    color: var(--color-text-muted, #666666);
                    font-size: 14px;
                }
            </style>
            
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
            
            const id = document.createElement('div');
            id.className = 'id';
            id.textContent = command.id;
            
            item.appendChild(label);
            item.appendChild(id);
            
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
        const selectedElement = this.resultsContainer.querySelector('.result-item.selected');
        if (selectedElement && typeof selectedElement.scrollIntoView === 'function') {
            selectedElement.scrollIntoView({ block: 'nearest' });
        }
    }
}

if (!customElements.get('command-palette')) {
    customElements.define('command-palette', CommandPalette);
}
