import { Command, SelectOption } from "../../extensions/shortcut-extension/types.js";
import { CommandExtension } from "../../extensions/command-extension/command-extension.js";
import { ShortcutExtension } from "../../extensions/shortcut-extension/shortcut-extension.js";
import { css } from "../../utils/css-utils.js";
import { scrollbarSheet } from "../../styles/shared-sheets.js";
import commandPaletteCss from "./command-palette.css?inline";
import "../shortcut-display/shortcut-display.js";
import { ShortcutDisplay } from "../shortcut-display/shortcut-display.js";

export class CommandPalette extends HTMLElement {
    private commandExtension: CommandExtension;
    private shortcutExtension: ShortcutExtension | null;
    private isOpen: boolean = false;
    private searchInput: HTMLInputElement | null = null;
    private resultsContainer: HTMLDivElement | null = null;
    private selectedIndex: number = 0;
    private filteredCommands: Command[] = [];

    private isSelectionMode: boolean = false;
    private selectionOptions: SelectOption[] = [];
    private filteredOptions: SelectOption[] = [];
    private selectionResolve: ((value: any) => void) | null = null;
    private selectionReject: ((reason?: any) => void) | null = null;

    constructor(commandExtension: CommandExtension, shortcutExtension?: ShortcutExtension) {
        super();
        this.commandExtension = commandExtension;
        this.shortcutExtension = shortcutExtension || null;

        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.adoptedStyleSheets = [scrollbarSheet, css(commandPaletteCss)];

        this.shadowRoot!.innerHTML = `
            <div class="overlay"></div>
            <div class="palette">
                <div class="search-container">
                    <input type="text" class="search-input" placeholder="Type a command..." autocomplete="off" spellcheck="false" />
                </div>
                <div class="results"></div>
            </div>
        `;

        this.searchInput = this.shadowRoot!.querySelector('.search-input');
        this.resultsContainer = this.shadowRoot!.querySelector('.results');
        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.searchInput?.addEventListener('input', () => this.handleSearch());
        this.searchInput?.addEventListener('keydown', (e) => this.handleKeyDown(e));
        const overlay = this.shadowRoot!.querySelector('.overlay');
        overlay?.addEventListener('click', (e) => { if (e.target === overlay) this.close(); });
    }

    open() {
        this.isOpen = true;
        this.classList.add('open');
        this.selectedIndex = 0;
        if (this.searchInput) {
            this.searchInput.value = '';
            this.searchInput.placeholder = 'Type a command...';
            this.searchInput.focus();
        }
        this.handleSearch();
    }

    close() {
        this.isOpen = false;
        this.classList.remove('open');
        this.filteredCommands = [];
        if (this.searchInput) this.searchInput.value = '';
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
        if (this.isOpen) this.close(); else this.open();
    }

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
            this.filteredOptions = query === ''
                ? this.selectionOptions
                : this.selectionOptions.filter(opt =>
                    opt.label.toLowerCase().includes(query) ||
                    opt.id.toLowerCase().includes(query) ||
                    (opt.description?.toLowerCase().includes(query) ?? false));
            this.selectedIndex = 0;
            this.renderSelection();
        } else {
            const all = this.commandExtension.getAll().filter(cmd => cmd.id !== 'core/command-palette/toggle');
            this.filteredCommands = query === ''
                ? all
                : all.filter(cmd =>
                    cmd.label.toLowerCase().includes(query) ||
                    cmd.id.toLowerCase().includes(query) ||
                    (cmd.description?.toLowerCase().includes(query) ?? false));
            this.selectedIndex = 0;
            this.render();
        }
    }

    private handleKeyDown(e: KeyboardEvent) {
        switch (e.key) {
            case 'Escape': e.preventDefault(); this.close(); break;
            case 'ArrowDown':
                e.preventDefault();
                const maxDown = this.isSelectionMode ? this.filteredOptions.length - 1 : this.filteredCommands.length - 1;
                this.selectedIndex = Math.min(this.selectedIndex + 1, maxDown);
                this.isSelectionMode ? this.renderSelection() : this.render();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
                this.isSelectionMode ? this.renderSelection() : this.render();
                break;
            case 'Enter': e.preventDefault(); this.isSelectionMode ? this.selectOption() : this.executeSelected(); break;
        }
    }

    private executeSelected() {
        const cmd = this.filteredCommands[this.selectedIndex];
        if (cmd) { this.commandExtension.execute(cmd.id); this.close(); }
    }

    private selectOption() {
        const opt = this.filteredOptions[this.selectedIndex];
        if (opt && this.selectionResolve) {
            const value = opt.value;
            const resolve = this.selectionResolve;
            this.isSelectionMode = false;
            this.selectionOptions = [];
            this.filteredOptions = [];
            this.selectionResolve = null;
            this.selectionReject = null;
            this.isOpen = false;
            this.classList.remove('open');
            resolve(value);
        }
    }

    private render() {
        if (!this.resultsContainer) return;
        if (this.filteredCommands.length === 0) {
            this.resultsContainer.innerHTML = `<div class="empty-state">No commands found</div>`;
            return;
        }
        this.resultsContainer.innerHTML = '';
        this.filteredCommands.forEach((command, index) => {
            const item = document.createElement('div');
            item.className = 'result-item';
            if (index === this.selectedIndex) item.classList.add('selected');
            if (command.description) {
                const lc = document.createElement('div'); lc.className = 'label-container';
                const l = document.createElement('div'); l.className = 'label'; l.textContent = command.label;
                const d = document.createElement('div'); d.className = 'description'; d.textContent = command.description;
                lc.appendChild(l); lc.appendChild(d); item.appendChild(lc);
            } else {
                const l = document.createElement('div'); l.className = 'label'; l.textContent = command.label;
                item.appendChild(l);
            }
            if (this.shortcutExtension) {
                const shortcuts = this.shortcutExtension.getShortcutsForCommand(command.id);
                if (shortcuts.length > 0) {
                    const sd = document.createElement('app-shortcut-display') as ShortcutDisplay;
                    sd.setAttribute('shortcut', ShortcutExtension.formatShortcut(shortcuts[0]));
                    item.appendChild(sd);
                }
            }
            item.addEventListener('click', () => { this.selectedIndex = index; this.executeSelected(); });
            item.addEventListener('mouseenter', () => { this.selectedIndex = index; this.render(); });
            this.resultsContainer!.appendChild(item);
        });
        const sel = this.resultsContainer.querySelector('.result-item.selected');
        if (sel && typeof (sel as any).scrollIntoView === 'function') sel.scrollIntoView({ block: 'nearest' });
    }

    private renderSelection() {
        if (!this.resultsContainer) return;
        if (this.filteredOptions.length === 0) {
            this.resultsContainer.innerHTML = `<div class="empty-state">No options found</div>`;
            return;
        }
        this.resultsContainer.innerHTML = '';
        this.filteredOptions.forEach((option, index) => {
            const item = document.createElement('div');
            item.className = 'result-item';
            if (index === this.selectedIndex) item.classList.add('selected');
            if (option.description) {
                const lc = document.createElement('div'); lc.className = 'label-container';
                const l = document.createElement('div'); l.className = 'label'; l.textContent = option.label;
                const d = document.createElement('div'); d.className = 'description'; d.textContent = option.description;
                lc.appendChild(l); lc.appendChild(d); item.appendChild(lc);
            } else {
                const l = document.createElement('div'); l.className = 'label'; l.textContent = option.label;
                item.appendChild(l);
            }
            item.addEventListener('click', () => { this.selectedIndex = index; this.selectOption(); });
            item.addEventListener('mouseenter', () => { this.selectedIndex = index; this.renderSelection(); });
            this.resultsContainer!.appendChild(item);
        });
        const sel2 = this.resultsContainer.querySelector('.result-item.selected');
        if (sel2 && typeof (sel2 as any).scrollIntoView === 'function') sel2.scrollIntoView({ block: 'nearest' });
    }
}

if (!customElements.get('command-palette')) {
    customElements.define('command-palette', CommandPalette);
}
